import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import './AdminDashboard.css'

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '')

type Tab = 'overview' | 'restaurants' | 'orders' | 'users'
type AdminRestaurant = {
  id: number; name: string; category: string; description: string; image: string
  rating: number; delivery_time: string; delivery_fee: number; tags: string[]
}
type AdminUser = { id: number; name: string; email: string; role: string; restaurant_id: number | null }
type AdminOrder = {
  id: number; customer_name: string; customer_email: string; phone: string
  address: string; notes: string; payment_method: string; status: string; created_at: string; total: number
  order_items: { id: number; restaurant_id: number; name: string; quantity: number; price: number }[]
}
type Overview = { restaurants: number; users: number; orders: number; activeOrders: number }
type ListData<T> = { items: T[]; total: number; page: number; pageSize: number }
type Form = {
  name: string; category: string; description: string; image: string; rating: string
  delivery_time: string; delivery_fee: string; tags: string
}
const emptyForm: Form = {
  name: '', category: '', description: '', image: '', rating: '0',
  delivery_time: '', delivery_fee: '0', tags: '',
}
const statuses = ['Placed', 'Preparing', 'Out for delivery', 'Delivered']
const money = (value: number) => `Rs. ${Number(value).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`
const date = (value: string) => new Date(value).toLocaleString()

async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('cravego_token')
  if (!token) throw new Error('Please log in again.')
  const response = await fetch(`${API_BASE_URL}/api/admin/${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
  })
  const result = await response.json().catch(() => null)
  if (!response.ok || !result?.success) {
    throw new Error(result?.message || `Unable to load admin data (${response.status}). Please try again.`)
  }
  return result.data as T
}

export default function AdminDashboard({ onRestaurantSaved }: {
  onRestaurantSaved: (restaurant: AdminRestaurant) => void
}) {
  const [tab, setTab] = useState<Tab>('overview')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([])
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<AdminRestaurant | 'new' | null>(null)
  const [form, setForm] = useState<Form>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const saveInFlight = useRef(false)
  const mounted = useRef(true)
  const nameInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    if (editing !== null) nameInput.current?.focus()
  }, [editing])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    const query = new URLSearchParams({ page: String(page), search })
    if (tab === 'orders' && status) query.set('status', status)
    async function load() {
      try {
        if (tab === 'overview') {
          const data = await adminRequest<Overview>('overview', { signal: controller.signal })
          if (!controller.signal.aborted) setOverview(data)
        } else {
          const data = await adminRequest<ListData<AdminRestaurant | AdminOrder | AdminUser>>(
            `${tab}?${query}`, { signal: controller.signal },
          )
          if (controller.signal.aborted) return
          if (tab === 'restaurants') setRestaurants(data.items as AdminRestaurant[])
          if (tab === 'orders') setOrders(data.items as AdminOrder[])
          if (tab === 'users') setUsers(data.items as AdminUser[])
          setTotal(data.total)
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load admin data.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [tab, page, search, status, reload])

  const changeTab = (next: Tab) => {
    setTab(next); setPage(1); setSearch(''); setSearchInput(''); setStatus('')
    setError(''); setNotice(''); setLoading(true); setEditing(null); setSaveError('')
  }
  const editRestaurant = (restaurant: AdminRestaurant | 'new') => {
    setEditing(restaurant); setSaveError(''); setNotice('')
    setForm(restaurant === 'new' ? emptyForm : {
      name: restaurant.name, category: restaurant.category, description: restaurant.description || '',
      image: restaurant.image || '', rating: String(restaurant.rating ?? 0),
      delivery_time: restaurant.delivery_time, delivery_fee: String(restaurant.delivery_fee ?? 0),
      tags: (restaurant.tags || []).join(', '),
    })
  }
  const saveRestaurant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (editing === null || saveInFlight.current) return
    saveInFlight.current = true
    setSaving(true); setSaveError(''); setNotice('')
    try {
      const data = await adminRequest<AdminRestaurant>(
        editing === 'new' ? 'restaurants' : `restaurants/${editing.id}`,
        {
          method: editing === 'new' ? 'POST' : 'PATCH',
          body: JSON.stringify({
            ...form, rating: Number(form.rating), delivery_fee: Number(form.delivery_fee),
            tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          }),
        },
      )
      if (!mounted.current) return
      onRestaurantSaved(data)
      setEditing(null); setNotice(`${data.name} saved successfully.`)
      setPage(1); setReload(value => value + 1)
    } catch (err) {
      if (mounted.current) setSaveError(err instanceof Error ? err.message : 'Unable to save restaurant.')
    } finally {
      saveInFlight.current = false
      if (mounted.current) setSaving(false)
    }
  }
  const updateForm = (key: keyof Form, value: string) => setForm(previous => ({ ...previous, [key]: value }))

  return (
    <section className="cg-admin">
      <header className="cg-admin-heading">
        <div><span className="eyebrow">CRAVEGO ADMIN</span><h1>Platform dashboard</h1><p>Manage restaurants and keep track of orders and customers.</p></div>
        <button className="cg-admin-secondary" disabled={loading || saving} onClick={() => setReload(value => value + 1)}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>
      <nav className="cg-admin-tabs" aria-label="Admin sections">
        {(['overview', 'restaurants', 'orders', 'users'] as Tab[]).map(item => (
          <button key={item} aria-current={tab === item ? 'page' : undefined}
            disabled={saving} onClick={() => { if (item !== tab) changeTab(item) }}>
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </nav>
      {notice && <p className="cg-admin-notice" role="status">{notice}</p>}

      {tab !== 'overview' && (
        <div className="cg-admin-toolbar">
          <form onSubmit={event => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); setReload(value => value + 1) }}>
            <label className="cg-admin-search-label" htmlFor="admin-search">
              {tab === 'restaurants' ? 'Search by name or category' : 'Search by name or email'}
            </label>
            <div className="cg-admin-search">
              <input id="admin-search" type="search" maxLength={100} value={searchInput} onChange={event => setSearchInput(event.target.value)} />
              <button type="submit" disabled={saving}>Search</button>
            </div>
          </form>
          {tab === 'orders' && <label>Status
            <select value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}>
              <option value="">All statuses</option>
              {statuses.map(item => <option key={item}>{item}</option>)}
            </select>
          </label>}
          {tab === 'restaurants' && <button disabled={saving} onClick={() => editRestaurant('new')}>+ Add restaurant</button>}
        </div>
      )}

      {tab === 'restaurants' && editing !== null && (
        <form className="cg-admin-editor" onSubmit={saveRestaurant}>
          <h2>{editing === 'new' ? 'Add restaurant' : `Edit ${editing.name}`}</h2>
          <fieldset disabled={saving}>
            <div className="cg-admin-fields">
              <label>Name<input ref={nameInput} required maxLength={120} value={form.name} onChange={e => updateForm('name', e.target.value)} /></label>
              <label>Category<input required maxLength={60} placeholder="Pizza, Burgers, Chicken..." value={form.category} onChange={e => updateForm('category', e.target.value)} /></label>
              <label>Delivery time<input required maxLength={60} placeholder="25–35 min" value={form.delivery_time} onChange={e => updateForm('delivery_time', e.target.value)} /></label>
              <label>Delivery fee (Rs.)<input type="number" required min="0" max="100000" step="0.01" value={form.delivery_fee} onChange={e => updateForm('delivery_fee', e.target.value)} /></label>
              <label>Rating (0–5)<input type="number" required min="0" max="5" step="0.1" value={form.rating} onChange={e => updateForm('rating', e.target.value)} /></label>
              <label>Image URL<input type="url" maxLength={2048} placeholder="https://..." value={form.image} onChange={e => updateForm('image', e.target.value)} /></label>
              <label className="cg-admin-wide">Tags, separated by commas<input maxLength={410} placeholder="Popular, Fast delivery" value={form.tags} onChange={e => updateForm('tags', e.target.value)} /></label>
              <label className="cg-admin-wide">Description<textarea maxLength={2000} rows={3} value={form.description} onChange={e => updateForm('description', e.target.value)} /></label>
            </div>
            {saveError && <p className="cg-admin-error" role="alert">{saveError}</p>}
            <div className="cg-admin-actions"><button type="submit">{saving ? 'Saving...' : 'Save restaurant'}</button>
              <button type="button" className="cg-admin-secondary" onClick={() => setEditing(null)}>Cancel</button></div>
          </fieldset>
        </form>
      )}

      {error ? <div className="cg-admin-error" role="alert"><p>{error}</p><button onClick={() => setReload(value => value + 1)}>Try again</button></div>
        : loading ? <p className="cg-admin-empty" role="status">Loading {tab}...</p>
        : tab === 'overview' && overview ? (
          <div className="cg-admin-stats">
            {([['Restaurants', overview.restaurants, 'restaurants'], ['Users', overview.users, 'users'],
              ['Total orders', overview.orders, 'orders'], ['Active orders', overview.activeOrders, 'orders']] as const).map(([label, value, target]) => (
              <button key={label} onClick={() => changeTab(target)}><span>{label}</span><strong>{value.toLocaleString()}</strong></button>
            ))}
          </div>
        ) : tab !== 'overview' && total === 0 ? <p className="cg-admin-empty">No {tab} found{search || status ? ' matching these filters' : ''}.</p>
        : tab === 'restaurants' ? (
          <div className="cg-admin-restaurants">{restaurants.map(restaurant => (
            <article className="cg-admin-card" key={restaurant.id}>
              <div><span className="eyebrow">#{restaurant.id} · {restaurant.category}</span><h2>{restaurant.name}</h2>
                <p>{restaurant.description}</p><p>{restaurant.delivery_time} · {money(restaurant.delivery_fee)} delivery · ★ {restaurant.rating}</p>
                <div className="restaurant-tags">{(restaurant.tags || []).map(tag => <span key={tag}>{tag}</span>)}</div>
              </div>
              <button className="cg-admin-secondary" disabled={saving} onClick={() => editRestaurant(restaurant)}>Edit</button>
            </article>
          ))}</div>
        ) : tab === 'orders' ? (
          <div className="cg-admin-orders">{orders.map(order => (
            <article className="cg-admin-card cg-admin-order" key={order.id}>
              <div className="cg-admin-order-top"><h2>CG-{order.id}</h2><span className="order-status">{order.status}</span></div>
              <p>{date(order.created_at)}</p><p><strong>{order.customer_name}</strong> · {order.customer_email}</p>
              <div className="cg-admin-order-top"><span>{order.payment_method}</span><strong>{money(order.total)}</strong></div>
              <details><summary>View order details</summary>
                <p>{order.phone}</p><p>{order.address}</p>{order.notes && <p>Notes: {order.notes}</p>}
                <ul>{(order.order_items || []).map(item => <li key={item.id}>
                  {item.quantity} × {item.name} · Restaurant #{item.restaurant_id} · {money(Number(item.price) * item.quantity)}
                </li>)}</ul>
              </details>
            </article>
          ))}</div>
        ) : tab === 'users' ? (
          <div className="cg-admin-table-wrap"><table><caption>CraveGo users</caption>
            <thead><tr><th scope="col">ID</th><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Restaurant ID</th></tr></thead>
            <tbody>{users.map(user => <tr key={user.id}><td>{user.id}</td><td>{user.name}</td><td>{user.email}</td><td>{user.role}</td><td>{user.restaurant_id ?? '—'}</td></tr>)}</tbody>
          </table></div>
        ) : null}

      {tab !== 'overview' && !error && !loading && total > 0 && (
        <div className="cg-admin-pagination">
          <span>{(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</span>
          <div className="cg-admin-actions"><button className="cg-admin-secondary" disabled={page <= 1 || saving} onClick={() => setPage(value => value - 1)}>Previous</button>
            <button className="cg-admin-secondary" disabled={page * 20 >= total || saving} onClick={() => setPage(value => value + 1)}>Next</button></div>
        </div>
      )}
    </section>
  )
}
