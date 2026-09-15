import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import './index.css'
import AdminDashboard from './AdminDashboard'

type Restaurant = {
  id: number
  name: string
  category: string
  rating: number
  deliveryTime: string
  deliveryFee: number
  image: string
  tags: string[]
  description: string
}

type MenuItem = {
  id: number
  restaurantId: number
  name: string
  description: string
  price: number
  category: string
  image: string
}

type CartItem = {
  itemId: number
  restaurantId: number
  name: string
  price: number
  image: string
  quantity: number
}

type Order = {
  id: string
  customerName: string
  phone: string
  address: string
  notes: string
  paymentMethod: string
  items: CartItem[]
  subtotal: number
  deliveryFee: number
  total: number
  status: 'Placed' | 'Preparing' | 'Out for delivery' | 'Delivered'
  createdAt: string
}


type Page =
  | 'home'
  | 'restaurants'
  | 'restaurant'
  | 'cart'
  | 'checkout'
  | 'orders'
  | 'restaurant-dashboard'
  | 'admin-dashboard'
  | 'login'
  | 'signup'


const categories = [
  'All',
  'Pizza',
  'Burgers',
  'Chicken',
  'Chinese',
  'Desserts',
  'Drinks',
]

type User = {
  id: number
  name: string
  email: string
  role: string
}

type RestaurantDashboardStats = {
  menuItems: number
  totalOrders: number
  activeOrders: number
  totalSales: number
}

type RestaurantDashboardOrderItem = {
  id: number
  menuItemId: number
  name: string
  price: number
  quantity: number
  image: string
}

const restaurantOrderStatuses = [
  'Placed',
  'Preparing',
  'Out for delivery',
  'Delivered',
] as const

type RestaurantOrderStatus = (typeof restaurantOrderStatuses)[number]

type RestaurantDashboardOrder = {
  id: number
  customerName: string
  customerEmail: string
  phone: string
  address: string
  notes: string
  paymentMethod: string
  status: string
  createdAt: string
  restaurantSubtotal: number
  items: RestaurantDashboardOrderItem[]
}

type RestaurantDashboardData = {
  user: User
  restaurant: Restaurant
  stats: RestaurantDashboardStats
  menuItems: MenuItem[]
  orders: RestaurantDashboardOrder[]
}

type RestaurantMenuForm = {
  name: string
  category: string
  description: string
  price: string
  image: string
}

const emptyRestaurantMenuForm: RestaurantMenuForm = {
  name: '',
  category: '',
  description: '',
  price: '',
  image: '',
}

function App() {
  const [page, setPage] = useState<Page>('home')
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] =
    useState('All')
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
const [restaurantsLoading, setRestaurantsLoading] = useState(true)
const [restaurantsError, setRestaurantsError] = useState('')
const [menuItems, setMenuItems] = useState<MenuItem[]>([])
const [menuLoading, setMenuLoading] = useState(false)
const [menuError, setMenuError] = useState('')



useEffect(() => {
  if (!selectedRestaurant) {
    setMenuItems([])
    return
  }

  const fetchMenuItems = async () => {
    try {
      setMenuLoading(true)
      setMenuError('')

      const response = await fetch(
        `http://localhost:5000/api/menu-items?restaurant_id=${selectedRestaurant.id}`
      )

      if (!response.ok) {
        throw new Error(
          `Failed to fetch menu (${response.status})`
        )
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(
          result.message || 'Failed to load menu'
        )
      }

      const formattedMenuItems: MenuItem[] =
        result.data.map((item: any) => ({
          id: Number(item.id),
          restaurantId: Number(item.restaurant_id),
          name: item.name,
          description: item.description,
          price: Number(item.price),
          category: item.category,
          image: item.image,
        }))

      setMenuItems(formattedMenuItems)
    } catch (error) {
      console.error('Menu API error:', error)

      setMenuError(
        error instanceof Error
          ? error.message
          : 'Failed to load menu'
      )
    } finally {
      setMenuLoading(false)
    }
  }

  fetchMenuItems()
}, [selectedRestaurant])

useEffect(() => {
  const fetchRestaurants = async () => {
    try {
      setRestaurantsLoading(true)
      setRestaurantsError('')

      const response = await fetch(
        'http://localhost:5000/api/restaurants',
        { signal: AbortSignal.timeout(15000) },
      )

      if (!response.ok) {
        throw new Error(
          `Failed to fetch restaurants (${response.status})`
        )
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(
          result.message || 'Failed to load restaurants'
        )
      }

    setRestaurants(
  result.data.map((restaurant: any) => ({
    ...restaurant,
    deliveryFee: restaurant.delivery_fee,
    deliveryTime: restaurant.delivery_time,
  }))
)
    } catch (error) {
      console.error('Restaurant API error:', error)

      setRestaurantsError(
        error instanceof Error
          ? (error.name === 'TimeoutError' ? 'Restaurants took too long to load. Please refresh and try again.' : error.message)
          : 'Failed to load restaurants'
      )
    } finally {
      setRestaurantsLoading(false)
    }
  }

  fetchRestaurants()
}, [])

  const [cart, setCart] = useState<CartItem[]>([])

  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery')
  const [orders, setOrders] = useState<Order[]>([])
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [latestOrder, setLatestOrder] = useState<Order | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const token = localStorage.getItem('cravego_token')
      const storedUser = localStorage.getItem('cravego_current_user')

      if (!token || !storedUser) {
        return null
      }

      return JSON.parse(storedUser)
    } catch {
      return null
    }
  })

  useEffect(() => {
    // Remove users/passwords saved by the old localStorage-only auth system.
    localStorage.removeItem('cravego_users')
  }, [])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState('')

  useEffect(() => {
  if (page !== 'orders' || !currentUser) {
    return
  }

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true)
      setOrdersError('')

      const token = localStorage.getItem('cravego_token')

      if (!token) {
        throw new Error('Please log in again.')
      }

      const response = await fetch(
        'http://localhost:5000/api/orders',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error(
          `Failed to fetch orders (${response.status})`,
        )
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(
          result.message || 'Failed to load orders',
        )
      }

      const formattedOrders: Order[] = result.data.map(
        (order: any) => ({
          id: `CG-${order.id}`,
          customerName: order.customer_name,
          phone: order.phone,
          address: order.address,
          notes: order.notes || '',
          paymentMethod: order.payment_method,

          items: order.order_items.map(
            (item: any) => ({
              itemId: Number(item.menu_item_id),
              restaurantId: Number(
                item.restaurant_id,
              ),
              name: item.name,
              price: Number(item.price),
              image: item.image,
              quantity: Number(item.quantity),
            }),
          ),

          subtotal: Number(order.subtotal),
          deliveryFee: Number(
            order.delivery_fee,
          ),
          total: Number(order.total),
          status: order.status,

          createdAt: new Date(
            order.created_at,
          ).toLocaleString(),
        }),
      )

      if (localStorage.getItem('cravego_token') === token) {
        setOrders(formattedOrders)
      }
    } catch (error) {
      console.error('Orders API error:', error)

      setOrdersError(
        error instanceof Error
          ? error.message
          : 'Failed to load orders',
      )
    } finally {
      setOrdersLoading(false)
    }
  }

  fetchOrders()
}, [page, currentUser])

  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [returnPage, setReturnPage] = useState<Page>('home')
const [orderSubmitting, setOrderSubmitting] = useState(false)

  const [restaurantDashboard, setRestaurantDashboard] =
    useState<RestaurantDashboardData | null>(null)
  const [restaurantDashboardLoading, setRestaurantDashboardLoading] =
    useState(false)
  const [restaurantDashboardError, setRestaurantDashboardError] =
    useState('')
  const [restaurantMenuForm, setRestaurantMenuForm] =
    useState<RestaurantMenuForm>(emptyRestaurantMenuForm)
  const [editingRestaurantMenuItemId, setEditingRestaurantMenuItemId] =
    useState<number | null>(null)
  const [restaurantMenuSaving, setRestaurantMenuSaving] =
    useState(false)
  const [restaurantMenuDeletingId, setRestaurantMenuDeletingId] =
    useState<number | null>(null)

  const [restaurantOrderUpdating, setRestaurantOrderUpdating] =
    useState<Record<number, boolean>>({})
  const [restaurantOrderErrors, setRestaurantOrderErrors] =
    useState<Record<number, string>>({})
  const restaurantOrderRequests = useRef(new Set<number>())

  const loadRestaurantDashboard = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'restaurant') {
      return
    }

    const token = localStorage.getItem('cravego_token')

    if (!token) {
      setRestaurantDashboardError('Please log in again.')
      return
    }

    try {
      setRestaurantDashboardLoading(true)
      setRestaurantDashboardError('')

      const response = await fetch(
        'http://localhost:5000/api/restaurant/dashboard',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || 'Failed to load restaurant dashboard',
        )
      }

      const rawRestaurant = result.data.restaurant

      const formattedRestaurant: Restaurant = {
        id: Number(rawRestaurant.id),
        name: rawRestaurant.name,
        category: rawRestaurant.category,
        rating: Number(rawRestaurant.rating),
        deliveryTime: rawRestaurant.delivery_time,
        deliveryFee: Number(rawRestaurant.delivery_fee),
        image: rawRestaurant.image,
        tags: rawRestaurant.tags || [],
        description: rawRestaurant.description || '',
      }

      const formattedMenuItems: MenuItem[] =
        (result.data.menuItems || []).map((item: any) => ({
          id: Number(item.id),
          restaurantId: Number(item.restaurant_id),
          name: item.name,
          description: item.description || '',
          price: Number(item.price),
          category: item.category,
          image: item.image || '',
        }))

      const formattedOrders: RestaurantDashboardOrder[] =
        (result.data.orders || []).map((order: any) => ({
          id: Number(order.id),
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          phone: order.phone,
          address: order.address,
          notes: order.notes || '',
          paymentMethod: order.paymentMethod,
          status: order.status,
          createdAt: new Date(order.createdAt).toLocaleString(),
          restaurantSubtotal: Number(order.restaurantSubtotal),
          items: (order.items || []).map((item: any) => ({
            id: Number(item.id),
            menuItemId: Number(item.menuItemId),
            name: item.name,
            price: Number(item.price),
            quantity: Number(item.quantity),
            image: item.image || '',
          })),
        }))

      if (localStorage.getItem('cravego_token') !== token) return
      setRestaurantDashboard({
        user: result.data.user,
        restaurant: formattedRestaurant,
        stats: {
          menuItems: Number(result.data.stats?.menuItems || 0),
          totalOrders: Number(result.data.stats?.totalOrders || 0),
          activeOrders: Number(result.data.stats?.activeOrders || 0),
          totalSales: Number(result.data.stats?.totalSales || 0),
        },
        menuItems: formattedMenuItems,
        orders: formattedOrders,
      })
    } catch (error) {
      console.error('Restaurant dashboard error:', error)

      setRestaurantDashboardError(
        error instanceof Error
          ? error.message
          : 'Failed to load restaurant dashboard',
      )
    } finally {
      setRestaurantDashboardLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    if (
      page === 'restaurant-dashboard' &&
      currentUser?.role === 'restaurant'
    ) {
      loadRestaurantDashboard()
    }
  }, [page, currentUser, loadRestaurantDashboard])

  const handleRestaurantOrderStatusChange = async (
    order: RestaurantDashboardOrder,
    status: RestaurantOrderStatus,
  ) => {
    if (
      currentUser?.role !== 'restaurant' ||
      restaurantOrderRequests.current.has(order.id) ||
      status === order.status ||
      !restaurantOrderStatuses.includes(status)
    ) {
      return
    }

    restaurantOrderRequests.current.add(order.id)
    setRestaurantOrderUpdating(previous => ({ ...previous, [order.id]: true }))
    setRestaurantOrderErrors(previous => ({ ...previous, [order.id]: '' }))

    try {
      const token = localStorage.getItem('cravego_token')
      if (!token) {
        throw new Error('Please log in again.')
      }

      const response = await fetch(
        `http://localhost:5000/api/restaurant/orders/${order.id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        },
      )
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update order status')
      }

      // Keep the confirmed status visible even if the dashboard reload fails.
      setRestaurantDashboard(previous => previous ? {
        ...previous,
        orders: previous.orders.map(item =>
          item.id === order.id ? { ...item, status } : item,
        ),
      } : previous)
      await loadRestaurantDashboard()
    } catch (error) {
      setRestaurantOrderErrors(previous => ({
        ...previous,
        [order.id]: error instanceof Error
          ? error.message
          : 'Failed to update order status. Please try again.',
      }))
    } finally {
      restaurantOrderRequests.current.delete(order.id)
      setRestaurantOrderUpdating(previous => ({ ...previous, [order.id]: false }))
    }
  }

  const resetRestaurantMenuForm = () => {
    setRestaurantMenuForm(emptyRestaurantMenuForm)
    setEditingRestaurantMenuItemId(null)
  }

  const startEditingRestaurantMenuItem = (item: MenuItem) => {
    setEditingRestaurantMenuItemId(item.id)
    setRestaurantMenuForm({
      name: item.name,
      category: item.category,
      description: item.description,
      price: String(item.price),
      image: item.image,
    })

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  const handleRestaurantMenuSubmit = async () => {
    if (restaurantMenuSaving) {
      return
    }

    const token = localStorage.getItem('cravego_token')
    const name = restaurantMenuForm.name.trim()
    const category = restaurantMenuForm.category.trim()
    const price = Number(restaurantMenuForm.price)

    if (!token) {
      window.alert('Please log in again.')
      return
    }

    if (!name || !category) {
      window.alert('Name and category are required.')
      return
    }

    if (
      restaurantMenuForm.price.trim() === '' ||
      Number.isNaN(price) ||
      price < 0
    ) {
      window.alert('Please enter a valid price.')
      return
    }

    try {
      setRestaurantMenuSaving(true)

      const isEditing =
        editingRestaurantMenuItemId !== null

      const url = isEditing
        ? `http://localhost:5000/api/restaurant/menu/${editingRestaurantMenuItemId}`
        : 'http://localhost:5000/api/restaurant/menu'

      const response = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          category,
          description:
            restaurantMenuForm.description.trim(),
          price,
          image: restaurantMenuForm.image.trim(),
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            (isEditing
              ? 'Failed to update menu item'
              : 'Failed to create menu item'),
        )
      }

      resetRestaurantMenuForm()
      await loadRestaurantDashboard()
    } catch (error) {
      console.error('Restaurant menu save error:', error)

      window.alert(
        error instanceof Error
          ? error.message
          : 'Failed to save menu item',
      )
    } finally {
      setRestaurantMenuSaving(false)
    }
  }

  const handleRestaurantMenuDelete = async (item: MenuItem) => {
    const token = localStorage.getItem('cravego_token')

    if (!token) {
      window.alert('Please log in again.')
      return
    }

    const confirmed = window.confirm(
      `Delete "${item.name}" from your menu?`,
    )

    if (!confirmed) {
      return
    }

    try {
      setRestaurantMenuDeletingId(item.id)

      const response = await fetch(
        `http://localhost:5000/api/restaurant/menu/${item.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || 'Failed to delete menu item',
        )
      }

      if (editingRestaurantMenuItemId === item.id) {
        resetRestaurantMenuForm()
      }

      await loadRestaurantDashboard()
    } catch (error) {
      console.error('Restaurant menu delete error:', error)

      window.alert(
        error instanceof Error
          ? error.message
          : 'Failed to delete menu item',
      )
    } finally {
      setRestaurantMenuDeletingId(null)
    }
  }

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0,
  )

  const cartSubtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  )

  const cartRestaurantIds = Array.from(
    new Set(cart.map(item => item.restaurantId)),
  )

  const cartRestaurants = cartRestaurantIds
    .map(id =>
      restaurants.find(
        restaurant => restaurant.id === id,
      ),
    )
    .filter(
      (restaurant): restaurant is Restaurant =>
        Boolean(restaurant),
    )

  const deliveryFee = cartRestaurants.reduce(
    (total, restaurant) =>
      total + restaurant.deliveryFee,
    0,
  )

  const cartTotal = cartSubtotal + deliveryFee

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(restaurant => {
      const matchesCategory =
        selectedCategory === 'All' ||
        restaurant.category === selectedCategory

      const query = searchQuery.toLowerCase().trim()

      const matchesSearch =
        query === '' ||
        restaurant.name
          .toLowerCase()
          .includes(query) ||
        restaurant.category
          .toLowerCase()
          .includes(query) ||
        restaurant.tags.some(tag =>
          tag.toLowerCase().includes(query),
        )

      return matchesCategory && matchesSearch
    })
  }, [restaurants, searchQuery, selectedCategory])

  const openRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant)
    setPage('restaurant')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

const handlePlaceOrder = async () => {
  if (orderSubmitting) {
    return
  }

  if (!currentUser) {
    setReturnPage('checkout')
    setPage('login')
    return
  }

  if (!customerName.trim()) {
    window.alert('Please enter your name.')
    return
  }

  if (!phone.trim()) {
    window.alert('Please enter your phone number.')
    return
  }

  if (!address.trim()) {
    window.alert('Please enter your delivery address.')
    return
  }

  if (cart.length === 0) {
    window.alert('Your cart is empty.')
    return
  }

  try {
    setOrderSubmitting(true)

    const token = localStorage.getItem('cravego_token')

    if (!token) {
      throw new Error('Please log in again.')
    }

    const response = await fetch(
      'http://localhost:5000/api/orders',
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          customerName: customerName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          notes: notes.trim(),
          paymentMethod,
          subtotal: cartSubtotal,
          deliveryFee,
          total: cartTotal,
          items: cart,
        }),
      },
    )

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || 'Failed to place order',
      )
    }

    if (localStorage.getItem('cravego_token') !== token) return
    const savedOrder: Order = {
      id: `CG-${result.data.id}`,
      customerName: result.data.customer_name,
      phone: result.data.phone,
      address: result.data.address,
      notes: result.data.notes || '',
      paymentMethod: result.data.payment_method,
      items: result.data.items,
      subtotal: Number(result.data.subtotal),
      deliveryFee: Number(result.data.delivery_fee),
      total: Number(result.data.total),
      status: result.data.status,
      createdAt: new Date(
        result.data.created_at,
      ).toLocaleString(),
    }

    setOrders(currentOrders => [
      savedOrder,
      ...currentOrders,
    ])

    setLatestOrder(savedOrder)
    setOrderPlaced(true)
    setCart([])

  } catch (error) {
    console.error('Place order error:', error)

    window.alert(
      error instanceof Error
        ? error.message
        : 'Failed to place order',
    )
  } finally {
    setOrderSubmitting(false)
  }
}
  const openLogin = (destination: Page = 'home') => {
    setAuthError('')
    setAuthName('')
    setAuthEmail('')
    setAuthPassword('')
    setConfirmPassword('')
    setReturnPage(destination)
    setPage('login')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSignup = async () => {
    if (authLoading) {
      return
    }

    setAuthError('')

    const name = authName.trim()
    const email = authEmail.trim().toLowerCase()

    if (!name) {
      setAuthError('Please enter your full name.')
      return
    }

    if (!email || !email.includes('@')) {
      setAuthError('Please enter a valid email address.')
      return
    }

    if (authPassword.length < 6) {
      setAuthError('Password must be at least 6 characters.')
      return
    }

    if (authPassword !== confirmPassword) {
      setAuthError('Passwords do not match.')
      return
    }

    try {
      setAuthLoading(true)

      const response = await fetch(
        'http://localhost:5000/api/auth/signup',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            email,
            password: authPassword,
          }),
        },
      )

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || 'Signup failed',
        )
      }

      const user: User = result.data.user
      const token: string = result.data.token

      setCurrentUser(user)
      localStorage.setItem(
        'cravego_current_user',
        JSON.stringify(user),
      )
      localStorage.setItem('cravego_token', token)

      setAuthName('')
      setAuthEmail('')
      setAuthPassword('')
      setConfirmPassword('')
      setAuthError('')
      setPage(returnPage)
    } catch (error) {
      console.error('Signup error:', error)

      setAuthError(
        error instanceof Error
          ? error.message
          : 'Signup failed',
      )
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogin = async () => {
    if (authLoading) {
      return
    }

    setAuthError('')

    const email = authEmail.trim().toLowerCase()

    if (!email || !email.includes('@')) {
      setAuthError('Please enter a valid email address.')
      return
    }

    if (!authPassword) {
      setAuthError('Please enter your password.')
      return
    }

    try {
      setAuthLoading(true)

      const response = await fetch(
        'http://localhost:5000/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password: authPassword,
          }),
        },
      )

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || 'Login failed',
        )
      }

      const user: User = result.data.user
      const token: string = result.data.token

      setCurrentUser(user)
      localStorage.setItem(
        'cravego_current_user',
        JSON.stringify(user),
      )
      localStorage.setItem('cravego_token', token)

      setAuthEmail('')
      setAuthPassword('')
      setAuthError('')
      setPage(returnPage)
    } catch (error) {
      console.error('Login error:', error)

      setAuthError(
        error instanceof Error
          ? error.message
          : 'Login failed',
      )
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    setOrders([])
    setLatestOrder(null)
    setOrderPlaced(false)
    setRestaurantDashboard(null)
    setCustomerName('')
    setPhone('')
    setAddress('')
    setNotes('')
    setCurrentUser(null)
    localStorage.removeItem('cravego_current_user')
    localStorage.removeItem('cravego_token')
    localStorage.removeItem('cravego_users')
    setPage('home')
  }

  const switchAuthMode = (mode: 'login' | 'signup') => {
    setAuthError('')
    setPage(mode)
  }

  const addToCart = (item: MenuItem) => {
    const isNewRestaurant =
      cart.length > 0 &&
      !cart.some(
        cartItem =>
          cartItem.restaurantId === item.restaurantId,
      )

    if (isNewRestaurant) {
      const restaurantName =
        restaurants.find(
          restaurant =>
            restaurant.id === item.restaurantId,
        )?.name ?? 'this restaurant'

      const confirmAdd = window.confirm(
        `Your cart already contains items from another restaurant.\n\n` +
          `Add "${item.name}" from ${restaurantName} anyway?`,
      )

      if (!confirmAdd) {
        return
      }
    }

    const existingItem = cart.find(
      cartItem => cartItem.itemId === item.id,
    )

    if (existingItem) {
      setCart(
        cart.map(cartItem =>
          cartItem.itemId === item.id
            ? {
                ...cartItem,
                quantity: cartItem.quantity + 1,
              }
            : cartItem,
        ),
      )
    } else {
      setCart([
        ...cart,
        {
          itemId: item.id,
          restaurantId: item.restaurantId,
          name: item.name,
          price: item.price,
          image: item.image,
          quantity: 1,
        },
      ])
    }
  }

  const increaseQuantity = (itemId: number) => {
    setCart(
      cart.map(item =>
        item.itemId === itemId
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item,
      ),
    )
  }

  const decreaseQuantity = (itemId: number) => {
    setCart(
      cart
        .map(item =>
          item.itemId === itemId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item,
        )
        .filter(item => item.quantity > 0),
    )
  }

  const removeFromCart = (itemId: number) => {
    setCart(
      cart.filter(item => item.itemId !== itemId),
    )
  }

  const goToRestaurants = () => {
    setPage('restaurants')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goHome = () => {
    setPage('home')
    setSelectedRestaurant(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app">
      <header className="navbar">
        <div className="navbar-inner">
          <button
            className="logo"
            onClick={goHome}
          >
            <span className="logo-icon">🍴</span>
            <span>Crave<span>Go</span></span>
          </button>

          <div className="location">
            <span className="location-icon">📍</span>

            <div>
              <small>Delivering to</small>
              <strong>Mandi Bahauddin</strong>
            </div>
          </div>

          <nav className="nav-links">
            <button
              className={
                page === 'home' ? 'active' : ''
              }
              onClick={goHome}
            >
              Home
            </button>

            <button
              className={
                page === 'restaurants' ||
                page === 'restaurant'
                  ? 'active'
                  : ''
              }
              onClick={goToRestaurants}
            >
              Restaurants
            </button>

            <button
              className={
                page === 'orders' ? 'active' : ''
              }
              onClick={() => currentUser ? setPage('orders') : openLogin('orders')}
            >
              Orders
            </button>

            {currentUser?.role === 'admin' && (
              <button
                className={page === 'admin-dashboard' ? 'active' : ''}
                onClick={() => setPage('admin-dashboard')}
              >
                Admin
              </button>
            )}

            {currentUser?.role === 'restaurant' && (
              <button
                className={
                  page === 'restaurant-dashboard'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setPage('restaurant-dashboard')
                }
              >
                Dashboard
              </button>
            )}
          </nav>

          <div className="navbar-actions">
            <button
              className="cart-button"
              onClick={() => setPage('cart')}
            >
              🛒
              <span>Cart</span>

              {cartCount > 0 && (
                <b>{cartCount}</b>
              )}
            </button>

            {currentUser ? (
              <div className="user-menu">
                <span className="user-greeting">Hi, {currentUser.name.split(' ')[0]}</span>
                <button className="login-button" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            ) : (
              <button className="login-button" onClick={() => openLogin('home')}>
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      <main>
        {(page === 'home' || page === 'restaurants') && (
          restaurantsLoading ? (
            <div className="empty-state" role="status">Loading restaurants...</div>
          ) : restaurantsError ? (
            <div className="empty-state" role="alert">{restaurantsError}</div>
          ) : null
        )}
        {page === 'admin-dashboard' && (
          currentUser?.role === 'admin' ? (
            <AdminDashboard
              key={currentUser.id}
              onRestaurantSaved={saved => {
                const restaurant: Restaurant = {
                  id: Number(saved.id), name: saved.name, category: saved.category,
                  description: saved.description || '', image: saved.image || '',
                  rating: Number(saved.rating), deliveryTime: saved.delivery_time,
                  deliveryFee: Number(saved.delivery_fee), tags: saved.tags || [],
                }
                setRestaurants(previous => previous.some(item => item.id === restaurant.id)
                  ? previous.map(item => item.id === restaurant.id ? restaurant : item)
                  : [...previous, restaurant])
                setSelectedRestaurant(previous => previous?.id === restaurant.id ? restaurant : previous)
              }}
            />
          ) : (
            <section className="empty-state">
              <h2>Admin access only</h2>
              <p>Please log in with an admin account to view this dashboard.</p>
            </section>
          )
        )}
        {page === 'home' && (
          <>
            <section className="hero">
              <div className="hero-content">
                <span className="hero-badge">
                  🚀 Food delivery made simple
                </span>

                <h1>
                  Good food.
                  <br />
                  <span>Delivered fast.</span>
                </h1>

                <p>
                  Discover your favorite meals from
                  local restaurants and get them
                  delivered straight to your door.
                </p>

                <div className="hero-search">
                  <span>🔍</span>

                  <input
                    value={searchQuery}
                    onChange={event =>
                      setSearchQuery(
                        event.target.value,
                      )
                    }
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        goToRestaurants()
                      }
                    }}
                    placeholder="Search for restaurants or food..."
                  />

                  <button
                    onClick={goToRestaurants}
                  >
                    Search
                  </button>
                </div>

                <div className="hero-stats">
                  <div>
                    <strong>8+</strong>
                    <span>Restaurants</span>
                  </div>

                  <div>
                    <strong>25+</strong>
                    <span>Menu Items</span>
                  </div>

                  <div>
                    <strong>4.8★</strong>
                    <span>Average Rating</span>
                  </div>
                </div>
              </div>

              <div className="hero-image">
                <img
                  src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=85"
                  alt="Delicious food"
                />

                <div className="floating-card floating-card-one">
                  <span>⭐</span>
                  <div>
                    <strong>4.8 Rating</strong>
                    <small>Top rated restaurants</small>
                  </div>
                </div>

                <div className="floating-card floating-card-two">
                  <span>🚴</span>
                  <div>
                    <strong>Fast Delivery</strong>
                    <small>25-40 minutes</small>
                  </div>
                </div>
              </div>
            </section>

            <section className="categories-section">
              <div className="section-header">
                <div>
                  <span className="eyebrow">
                    WHAT ARE YOU CRAVING?
                  </span>
                  <h2>Explore categories</h2>
                </div>

                <button
                  className="text-button"
                  onClick={goToRestaurants}
                >
                  View all →
                </button>
              </div>

              <div className="category-grid">
                {categories
                  .filter(
                    category =>
                      category !== 'All',
                  )
                  .map(category => (
                    <button
                      key={category}
                      className="category-card"
                      onClick={() => {
                        setSelectedCategory(
                          category,
                        )
                        setPage('restaurants')
                      }}
                    >
                      <div className="category-icon">
                        {category === 'Pizza' &&
                          '🍕'}
                        {category === 'Burgers' &&
                          '🍔'}
                        {category === 'Chicken' &&
                          '🍗'}
                        {category === 'Chinese' &&
                          '🍜'}
                        {category === 'Desserts' &&
                          '🍰'}
                        {category === 'Drinks' &&
                          '🥤'}
                      </div>

                      <strong>{category}</strong>

                      <span>
                        {
                          restaurants.filter(
                            restaurant =>
                              restaurant.category ===
                              category,
                          ).length
                        } restaurants
                      </span>
                    </button>
                  ))}
              </div>
            </section>

            <section className="restaurants-section">
              <div className="section-header">
                <div>
                  <span className="eyebrow">
                    POPULAR NEAR YOU
                  </span>
                  <h2>Top restaurants</h2>
                </div>

                <button
                  className="text-button"
                  onClick={goToRestaurants}
                >
                  See all →
                </button>
              </div>

              <div className="restaurant-grid">
                {restaurants
                  .slice(0, 4)
                  .map(restaurant => (
                    <RestaurantCard
                      key={restaurant.id}
                      restaurant={restaurant}
                      onClick={() =>
                        openRestaurant(
                          restaurant,
                        )
                      }
                    />
                  ))}
              </div>
            </section>
          </>
        )}

        {page === 'restaurants' && (
          <section className="restaurants-page">
            <div className="page-heading">
              <div>
                <span className="eyebrow">
                  DISCOVER FOOD
                </span>

                <h1>
                  Restaurants near you
                </h1>

                <p>
                  Find something delicious from
                  your favorite local restaurants.
                </p>
              </div>
            </div>

            <div className="restaurant-controls">
              <div className="page-search">
                <span>🔍</span>

                <input
                  value={searchQuery}
                  onChange={event =>
                    setSearchQuery(
                      event.target.value,
                    )
                  }
                  placeholder="Search restaurants..."
                />
              </div>

              <div className="category-filter">
                {categories.map(category => (
                  <button
                    key={category}
                    className={
                      selectedCategory ===
                      category
                        ? 'selected'
                        : ''
                    }
                    onClick={() =>
                      setSelectedCategory(
                        category,
                      )
                    }
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {restaurantsLoading || restaurantsError ? null : filteredRestaurants.length > 0 ? (
              <div className="restaurant-grid large">
                {filteredRestaurants.map(
                  restaurant => (
                    <RestaurantCard
                      key={restaurant.id}
                      restaurant={restaurant}
                      onClick={() =>
                        openRestaurant(
                          restaurant,
                        )
                      }
                    />
                  ),
                )}
              </div>
            ) : (
              <div className="empty-state">
                <div>🍽️</div>
                <h2>No restaurants found</h2>
                <p>
                  Try another search or category.
                </p>

                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedCategory(
                      'All',
                    )
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </section>
        )}

        {page === 'restaurant' &&
          selectedRestaurant && (
           <RestaurantPage
  restaurant={selectedRestaurant}
  menuItems={menuItems}
  menuLoading={menuLoading}
  menuError={menuError}
  onBack={goToRestaurants}
  onAddToCart={addToCart}
/>
          )}

        {page === 'cart' && (
          <section className="cart-page">
            <div className="page-heading">
              <div>
                <span className="eyebrow">
                  YOUR ORDER
                </span>

                <h1>Your cart</h1>

                <p>
                  Review your items before
                  checkout.
                </p>
              </div>
            </div>

            {cart.length === 0 ? (
              <div className="empty-cart">
                <div className="empty-cart-icon">
                  🛒
                </div>

                <h2>Your cart is empty</h2>

                <p>
                  Looks like you haven't added
                  anything delicious yet.
                </p>

                <button
                  onClick={goToRestaurants}
                >
                  Browse restaurants
                </button>
              </div>
            ) : (
              <div className="cart-layout">
                <div className="cart-main">
                  <div className="cart-restaurants">
                    <div className="cart-restaurants-header">
                      <span className="cart-restaurants-icon">
                        🏪
                      </span>

                      <div>
                        <span>
                          Restaurants in your
                          cart
                        </span>

                        <strong>
                          {cartRestaurants.length}{' '}
                          {cartRestaurants.length ===
                          1
                            ? 'restaurant'
                            : 'restaurants'}
                        </strong>
                      </div>
                    </div>

                    <div className="cart-restaurant-list">
                      {cartRestaurants.map(
                        restaurant => (
                          <div
                            className="cart-restaurant-chip"
                            key={restaurant.id}
                          >
                            <span>
                              {
                                restaurant.name
                              }
                            </span>

                            <small>
                              Delivery Rs.{' '}
                              {
                                restaurant.deliveryFee
                              }
                            </small>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="cart-items">
                    {cart.map(item => {
                      const restaurant =
                        restaurants.find(
                          restaurant =>
                            restaurant.id ===
                            item.restaurantId,
                        )

                      return (
                        <div
                          className="cart-item"
                          key={item.itemId}
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                          />

                          <div className="cart-item-info">
                            <h3>{item.name}</h3>

                            <p className="cart-item-restaurant">
                              🏪{' '}
                              {restaurant?.name}
                            </p>

                            <strong>
                              Rs. {item.price}
                            </strong>
                          </div>

                          <div className="cart-item-actions">
                            <div className="quantity-control">
                              <button
                                onClick={() =>
                                  decreaseQuantity(
                                    item.itemId,
                                  )
                                }
                              >
                                −
                              </button>

                              <span>
                                {item.quantity}
                              </span>

                              <button
                                onClick={() =>
                                  increaseQuantity(
                                    item.itemId,
                                  )
                                }
                              >
                                +
                              </button>
                            </div>

                            <button
                              className="remove-button"
                              onClick={() =>
                                removeFromCart(
                                  item.itemId,
                                )
                              }
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <aside className="cart-summary">
                  <h2>Order summary</h2>

                  <div className="summary-row">
                    <span>
                      Subtotal
                    </span>

                    <strong>
                      Rs. {cartSubtotal}
                    </strong>
                  </div>

                  <div className="summary-row">
                    <span>
                      Delivery fees
                    </span>

                    <strong>
                      Rs. {deliveryFee}
                    </strong>
                  </div>

                  <p className="delivery-fee-note">
                    Delivery is calculated
                    separately for each
                    restaurant.
                  </p>

                  <div className="summary-divider" />

                  <div className="summary-row total">
                    <span>Total</span>

                    <strong>
                      Rs. {cartTotal}
                    </strong>
                  </div>

                  <button
                    className="checkout-button"
                    onClick={() => {
                      if (currentUser) setPage('checkout')
                      else openLogin('checkout')
                    }}
                  >
                    Proceed to Checkout
                  </button>

                  <button
                    className="continue-shopping"
                    onClick={goToRestaurants}
                  >
                    ← Continue shopping
                  </button>
                </aside>
              </div>
            )}
          </section>
        )}

        {page === 'checkout' && (
        <main className="checkout-page">
          <div className="checkout-header">
            <button
              className="back-button"
              onClick={() => setPage('cart')}
            >
              ← Back to Cart
            </button>

            <p className="eyebrow">CraveGo Checkout</p>
            <h1>Complete your order</h1>
            <p>Enter your delivery details and place your order.</p>
          </div>

          <div className="checkout-layout">
            <section className="checkout-form-card">
              <h2>Delivery Information</h2>

              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={customerName}
                  onChange={event => setCustomerName(event.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  placeholder="03XX XXXXXXX"
                  value={phone}
                  onChange={event => setPhone(event.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Delivery Address</label>
                <textarea
                  placeholder="House number, street, area..."
                  value={address}
                  onChange={event => setAddress(event.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Order Notes</label>
                <textarea
                  placeholder="Any special instructions? (Optional)"
                  value={notes}
                  onChange={event => setNotes(event.target.value)}
                />
              </div>

              <div className="payment-section">
                <h2>Payment Method</h2>

                <label className="payment-option">
                  <input
                    type="radio"
                    name="payment"
                    value="Cash on Delivery"
                    checked={paymentMethod === 'Cash on Delivery'}
                    onChange={event => setPaymentMethod(event.target.value)}
                  />
                  <span>
                    <strong>Cash on Delivery</strong>
                    <small>Pay when your food arrives</small>
                  </span>
                </label>

                <label className="payment-option disabled">
                  <input
                    type="radio"
                    name="payment"
                    value="Card"
                    disabled
                  />
                  <span>
                    <strong>Card Payment</strong>
                    <small>Coming soon</small>
                  </span>
                </label>
              </div>

             <button
  className="place-order-button"
  onClick={handlePlaceOrder}
  disabled={orderSubmitting}
>
  {orderSubmitting
    ? 'Placing order...'
    : `Place Order · Rs. ${cartTotal}`}
</button>
            </section>

            <aside className="checkout-summary">
              <h2>Order Summary</h2>

              <div className="checkout-items">
                {cart.map(item => (
                  <div className="checkout-item" key={item.itemId}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>Qty: {item.quantity}</span>
                    </div>
                    <strong>Rs. {item.price * item.quantity}</strong>
                  </div>
                ))}
              </div>

              <div className="checkout-total-row">
                <span>Subtotal</span>
                <strong>Rs. {cartSubtotal}</strong>
              </div>

              <div className="checkout-total-row">
                <span>Delivery</span>
                <strong>Rs. {deliveryFee}</strong>
              </div>

              <div className="checkout-grand-total">
                <span>Total</span>
                <strong>Rs. {cartTotal}</strong>
              </div>
            </aside>
          </div>
        </main>
      )}

      {orderPlaced && latestOrder && (
        <div className="order-success-page">
          <div className="order-success-card">
            <div className="success-icon">✓</div>

            <p className="eyebrow">Order Confirmed</p>
            <h1>Thanks, {latestOrder.customerName}!</h1>
            <p className="success-message">
              Your CraveGo order has been successfully placed.
            </p>

            <div className="order-number">
              <span>Order Number</span>
              <strong>{latestOrder.id}</strong>
            </div>

            <div className="order-success-details">
              <div>
                <span>Status</span>
                <strong>{latestOrder.status}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>Rs. {latestOrder.total}</strong>
              </div>
              <div>
                <span>Payment</span>
                <strong>{latestOrder.paymentMethod}</strong>
              </div>
            </div>

            <div className="success-actions">
              <button
                className="primary-button"
                onClick={() => {
                  setOrderPlaced(false)
                  setPage('orders')
                }}
              >
                View My Orders
              </button>

              <button
                className="secondary-button"
                onClick={() => {
                  setOrderPlaced(false)
                  setPage('home')
                }}
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}

      {page === 'orders' && (
          <section className="orders-page">
            <div className="page-heading">
              <div>
                <span className="eyebrow">
                  ORDER HISTORY
                </span>

                <h1>Your orders</h1>

                <p>
                  Track and manage your previous
                  CraveGo orders.
                </p>
              </div>
            </div>

           {ordersLoading ? (
  <div className="empty-state">
    <div>⏳</div>
    <h2>Loading orders...</h2>
    <p>Please wait while we load your order history.</p>
  </div>
) : ordersError ? (
  <div className="empty-state">
    <div>⚠️</div>
    <h2>Unable to load orders</h2>
    <p>{ordersError}</p>
  </div>
) : orders.length === 0 ? (
  <div className="empty-state">
    <div>📦</div>

    <h2>No orders yet</h2>

    <p>
      Your completed orders will appear here.
    </p>

    <button onClick={goToRestaurants}>
      Start ordering
    </button>
  </div>
) : (
  <div className="orders-list">
    {orders.map(order => (
      <div
        className="order-history-card"
        key={order.id}
      >
        <div className="order-history-header">
          <div>
            <span>Order</span>
            <h3>{order.id}</h3>
          </div>

          <span className="order-status">
            {order.status}
          </span>
        </div>

        <p>{order.createdAt}</p>

        <div className="order-history-items">
          {order.items.map(item => (
            <div
              key={`${order.id}-${item.itemId}`}
              className="order-history-item"
            >
              <span>
                {item.quantity} × {item.name}
              </span>

              <strong>
                Rs. {item.price * item.quantity}
              </strong>
            </div>
          ))}
        </div>

        <div className="order-history-total">
          <span>Total</span>
          <strong>Rs. {order.total}</strong>
        </div>
      </div>
    ))}
  </div>
)}
          </section>
        )}
        {page === 'restaurant-dashboard' && (
          <section className="restaurants-page">
            <div className="page-heading">
              <div>
                <span className="eyebrow">
                  RESTAURANT PORTAL
                </span>

                <h1>
                  {restaurantDashboard?.restaurant.name ||
                    'Restaurant Dashboard'}
                </h1>

                <p>
                  Manage your menu and review orders from
                  one place.
                </p>
              </div>
            </div>

            {currentUser?.role !== 'restaurant' ? (
              <div className="empty-state">
                <div>🔒</div>
                <h2>Restaurant access only</h2>
                <p>
                  This dashboard is only available to
                  restaurant accounts.
                </p>
              </div>
            ) : restaurantDashboardLoading &&
              !restaurantDashboard ? (
              <div className="empty-state">
                <div>⏳</div>
                <h2>Loading dashboard...</h2>
                <p>
                  Please wait while we load your
                  restaurant.
                </p>
              </div>
            ) : restaurantDashboardError ? (
              <div className="empty-state">
                <div>⚠️</div>
                <h2>Unable to load dashboard</h2>
                <p>{restaurantDashboardError}</p>

                <button
                  onClick={loadRestaurantDashboard}
                >
                  Try again
                </button>
              </div>
            ) : restaurantDashboard ? (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '16px',
                    marginBottom: '28px',
                  }}
                >
                  <div className="order-history-card">
                    <span>Menu Items</span>
                    <h2>
                      {restaurantDashboard.stats.menuItems}
                    </h2>
                  </div>

                  <div className="order-history-card">
                    <span>Total Orders</span>
                    <h2>
                      {restaurantDashboard.stats.totalOrders}
                    </h2>
                  </div>

                  <div className="order-history-card">
                    <span>Active Orders</span>
                    <h2>
                      {restaurantDashboard.stats.activeOrders}
                    </h2>
                  </div>

                  <div className="order-history-card">
                    <span>Total Sales</span>
                    <h2>
                      Rs.{' '}
                      {restaurantDashboard.stats.totalSales.toLocaleString()}
                    </h2>
                  </div>
                </div>

                <div
                  className="order-history-card"
                  style={{ marginBottom: '28px' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: '18px',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <img
                      src={
                        restaurantDashboard.restaurant.image
                      }
                      alt={
                        restaurantDashboard.restaurant.name
                      }
                      style={{
                        width: '120px',
                        height: '90px',
                        objectFit: 'cover',
                        borderRadius: '14px',
                      }}
                    />

                    <div>
                      <span className="eyebrow">
                        YOUR RESTAURANT
                      </span>
                      <h2>
                        {
                          restaurantDashboard.restaurant
                            .name
                        }
                      </h2>
                      <p>
                        {
                          restaurantDashboard.restaurant
                            .description
                        }
                      </p>
                      <strong>
                        ⭐{' '}
                        {
                          restaurantDashboard.restaurant
                            .rating
                        }{' '}
                        · 🚴 Rs.{' '}
                        {
                          restaurantDashboard.restaurant
                            .deliveryFee
                        }
                      </strong>
                    </div>
                  </div>
                </div>

                <div
                  className="checkout-layout"
                  style={{ marginBottom: '36px' }}
                >
                  <section className="checkout-form-card">
                    <span className="eyebrow">
                      MENU MANAGEMENT
                    </span>
                    <h2>
                      {editingRestaurantMenuItemId
                        ? 'Edit menu item'
                        : 'Add menu item'}
                    </h2>

                    <div className="form-group">
                      <label>Item Name</label>
                      <input
                        type="text"
                        value={restaurantMenuForm.name}
                        onChange={event =>
                          setRestaurantMenuForm(
                            current => ({
                              ...current,
                              name: event.target.value,
                            }),
                          )
                        }
                        placeholder="e.g. Chicken Fajita Pizza"
                      />
                    </div>

                    <div className="form-group">
                      <label>Category</label>
                      <input
                        type="text"
                        value={
                          restaurantMenuForm.category
                        }
                        onChange={event =>
                          setRestaurantMenuForm(
                            current => ({
                              ...current,
                              category:
                                event.target.value,
                            }),
                          )
                        }
                        placeholder="e.g. Pizza"
                      />
                    </div>

                    <div className="form-group">
                      <label>Price</label>
                      <input
                        type="number"
                        min="0"
                        value={restaurantMenuForm.price}
                        onChange={event =>
                          setRestaurantMenuForm(
                            current => ({
                              ...current,
                              price: event.target.value,
                            }),
                          )
                        }
                        placeholder="e.g. 1299"
                      />
                    </div>

                    <div className="form-group">
                      <label>Image URL</label>
                      <input
                        type="text"
                        value={restaurantMenuForm.image}
                        onChange={event =>
                          setRestaurantMenuForm(
                            current => ({
                              ...current,
                              image: event.target.value,
                            }),
                          )
                        }
                        placeholder="https://..."
                      />
                    </div>

                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        value={
                          restaurantMenuForm.description
                        }
                        onChange={event =>
                          setRestaurantMenuForm(
                            current => ({
                              ...current,
                              description:
                                event.target.value,
                            }),
                          )
                        }
                        placeholder="Describe the menu item..."
                      />
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: '10px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <button
                        className="place-order-button"
                        onClick={
                          handleRestaurantMenuSubmit
                        }
                        disabled={restaurantMenuSaving}
                      >
                        {restaurantMenuSaving
                          ? 'Saving...'
                          : editingRestaurantMenuItemId
                            ? 'Save Changes'
                            : 'Add Menu Item'}
                      </button>

                      {editingRestaurantMenuItemId && (
                        <button
                          className="secondary-button"
                          onClick={
                            resetRestaurantMenuForm
                          }
                          disabled={
                            restaurantMenuSaving
                          }
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </section>

                  <aside className="checkout-summary">
                    <h2>Quick overview</h2>

                    <div className="checkout-total-row">
                      <span>Category</span>
                      <strong>
                        {
                          restaurantDashboard.restaurant
                            .category
                        }
                      </strong>
                    </div>

                    <div className="checkout-total-row">
                      <span>Delivery time</span>
                      <strong>
                        {
                          restaurantDashboard.restaurant
                            .deliveryTime
                        }
                      </strong>
                    </div>

                    <div className="checkout-total-row">
                      <span>Delivery fee</span>
                      <strong>
                        Rs.{' '}
                        {
                          restaurantDashboard.restaurant
                            .deliveryFee
                        }
                      </strong>
                    </div>

                    <div className="checkout-total-row">
                      <span>Manager</span>
                      <strong>
                        {restaurantDashboard.user.name}
                      </strong>
                    </div>
                  </aside>
                </div>

                <section
                  className="menu-section"
                  style={{ marginBottom: '38px' }}
                >
                  <div className="section-header">
                    <div>
                      <span className="eyebrow">
                        YOUR MENU
                      </span>
                      <h2>Manage menu items</h2>
                    </div>
                  </div>

                  {restaurantDashboard.menuItems.length ===
                  0 ? (
                    <div className="empty-state">
                      <div>🍽️</div>
                      <h2>No menu items yet</h2>
                      <p>
                        Use the form above to add your
                        first item.
                      </p>
                    </div>
                  ) : (
                    <div className="menu-grid">
                      {restaurantDashboard.menuItems.map(
                        item => (
                          <div
                            className="menu-item-card"
                            key={item.id}
                          >
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                              />
                            ) : (
                              <div
                                style={{
                                  minHeight: '180px',
                                  display: 'grid',
                                  placeItems: 'center',
                                  fontSize: '48px',
                                }}
                              >
                                🍽️
                              </div>
                            )}

                            <div className="menu-item-content">
                              <span className="menu-item-category">
                                {item.category}
                              </span>

                              <h3>{item.name}</h3>
                              <p>{item.description}</p>

                              <div className="menu-item-bottom">
                                <strong>
                                  Rs. {item.price}
                                </strong>

                                <div
                                  style={{
                                    display: 'flex',
                                    gap: '8px',
                                  }}
                                >
                                  <button
                                    onClick={() =>
                                      startEditingRestaurantMenuItem(
                                        item,
                                      )
                                    }
                                  >
                                    Edit
                                  </button>

                                  <button
                                    className="remove-button"
                                    onClick={() =>
                                      handleRestaurantMenuDelete(
                                        item,
                                      )
                                    }
                                    disabled={
                                      restaurantMenuDeletingId ===
                                      item.id
                                    }
                                  >
                                    {restaurantMenuDeletingId ===
                                    item.id
                                      ? 'Deleting...'
                                      : 'Delete'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </section>

                <section className="orders-page">
                  <div className="section-header">
                    <div>
                      <span className="eyebrow">
                        RESTAURANT ORDERS
                      </span>
                      <h2>Recent orders</h2>
                    </div>

                    <button
                      className="text-button"
                      onClick={
                        loadRestaurantDashboard
                      }
                      disabled={
                        restaurantDashboardLoading
                      }
                    >
                      {restaurantDashboardLoading
                        ? 'Refreshing...'
                        : 'Refresh'}
                    </button>
                  </div>

                  {restaurantDashboard.orders.length ===
                  0 ? (
                    <div className="empty-state">
                      <div>📦</div>
                      <h2>No restaurant orders yet</h2>
                      <p>
                        Orders containing your menu items
                        will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="orders-list">
                      {restaurantDashboard.orders.map(
                        order => (
                          <div
                            className="order-history-card"
                            key={order.id}
                          >
                            <div className="order-history-header">
                              <div>
                                <span>Order</span>
                                <h3>
                                  CG-{order.id}
                                </h3>
                              </div>

                              <span className="order-status">
                                {order.status}
                              </span>
                            </div>

                            <div className="form-group" style={{ marginTop: '16px' }}>
                              <label htmlFor={`restaurant-order-status-${order.id}`}>
                                Update status
                              </label>
                              <select
                                id={`restaurant-order-status-${order.id}`}
                                value={order.status}
                                disabled={Boolean(restaurantOrderUpdating[order.id])}
                                aria-busy={Boolean(restaurantOrderUpdating[order.id])}
                                aria-describedby={`restaurant-order-feedback-${order.id}`}
                                onChange={event => handleRestaurantOrderStatusChange(
                                  order,
                                  event.target.value as RestaurantOrderStatus,
                                )}
                                style={{
                                  padding: '10px 12px',
                                  borderRadius: '8px',
                                  border: '1px solid #ddd',
                                  font: 'inherit',
                                  maxWidth: '100%',
                                  opacity: restaurantOrderUpdating[order.id] ? 0.6 : 1,
                                }}
                              >
                                {!restaurantOrderStatuses.some(status => status === order.status) && (
                                  <option value={order.status} disabled>{order.status}</option>
                                )}
                                {restaurantOrderStatuses.map(status => (
                                  <option key={status} value={status}>{status}</option>
                                ))}
                              </select>
                              <div id={`restaurant-order-feedback-${order.id}`} aria-live="polite">
                                {restaurantOrderUpdating[order.id] && <p>Updating...</p>}
                                {restaurantOrderErrors[order.id] && (
                                  <p className="auth-error" role="alert">
                                    {restaurantOrderErrors[order.id]}
                                  </p>
                                )}
                              </div>
                            </div>

                            <p>{order.createdAt}</p>

                            <p>
                              <strong>
                                {order.customerName}
                              </strong>{' '}
                              · {order.phone}
                            </p>

                            <p>{order.address}</p>

                            <div className="order-history-items">
                              {order.items.map(item => (
                                <div
                                  key={`${order.id}-${item.id}`}
                                  className="order-history-item"
                                >
                                  <span>
                                    {item.quantity} ×{' '}
                                    {item.name}
                                  </span>

                                  <strong>
                                    Rs.{' '}
                                    {item.price *
                                      item.quantity}
                                  </strong>
                                </div>
                              ))}
                            </div>

                            <div className="order-history-total">
                              <span>
                                Restaurant subtotal
                              </span>
                              <strong>
                                Rs.{' '}
                                {
                                  order.restaurantSubtotal
                                }
                              </strong>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </section>
              </>
            ) : null}
          </section>
        )}

        {page === 'login' && (
          <section className="auth-page">
            <div className="auth-card">
              <div className="auth-icon">🍴</div>
              <span className="eyebrow">WELCOME BACK</span>
              <h1>Login to CraveGo</h1>
              <p>Sign in to continue ordering your favorite food.</p>
              {authError && <div className="auth-error">{authError}</div>}
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="form-group">
                <label>Password</label>
                <div className="password-field">
                  <input type={showPassword ? 'text' : 'password'} value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Enter your password" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                  <button type="button" onClick={() => setShowPassword(v => !v)}>{showPassword ? 'Hide' : 'Show'}</button>
                </div>
              </div>
              <button
                className="auth-submit"
                onClick={handleLogin}
                disabled={authLoading}
              >
                {authLoading ? 'Logging in...' : 'Login'}
              </button>
              <p className="auth-switch">Don't have an account? <button onClick={() => switchAuthMode('signup')}>Create one</button></p>
            </div>
          </section>
        )}

        {page === 'signup' && (
          <section className="auth-page">
            <div className="auth-card">
              <div className="auth-icon">🍴</div>
              <span className="eyebrow">JOIN CRAVEGO</span>
              <h1>Create your account</h1>
              <p>Save your details and make ordering faster.</p>
              {authError && <div className="auth-error">{authError}</div>}
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Your full name" />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="form-group">
                <label>Password</label>
                <div className="password-field">
                  <input type={showPassword ? 'text' : 'password'} value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="At least 6 characters" />
                  <button type="button" onClick={() => setShowPassword(v => !v)}>{showPassword ? 'Hide' : 'Show'}</button>
                </div>
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat your password" onKeyDown={e => e.key === 'Enter' && handleSignup()} />
              </div>
              <button
                className="auth-submit"
                onClick={handleSignup}
                disabled={authLoading}
              >
                {authLoading
                  ? 'Creating account...'
                  : 'Create Account'}
              </button>
              <p className="auth-switch">Already have an account? <button onClick={() => switchAuthMode('login')}>Login</button></p>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div>
            <button
              className="logo footer-logo"
              onClick={goHome}
            >
              <span className="logo-icon">
                🍴
              </span>

              <span>
                Crave<span>Go</span>
              </span>
            </button>

            <p>
              Good food. Delivered fast.
            </p>
          </div>

          <div className="footer-links">
            <div>
              <strong>CraveGo</strong>
              <button onClick={goHome}>
                Home
              </button>
              <button onClick={goToRestaurants}>
                Restaurants
              </button>
              <button
                onClick={() => currentUser ? setPage('orders') : openLogin('orders')}
              >
                Orders
              </button>
            </div>

            <div>
              <strong>Support</strong>
              <button
                onClick={() =>
                  window.alert(
                    'Help Center coming soon.',
                  )
                }
              >
                Help Center
              </button>

              <button
                onClick={() =>
                  window.alert(
                    'Contact support coming soon.',
                  )
                }
              >
                Contact
              </button>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          © 2026 CraveGo. All rights reserved.
        </div>
      </footer>
    </div>
  )
}

function RestaurantCard({
  restaurant,
  onClick,
}: {
  restaurant: Restaurant
  onClick: () => void
}) {
  return (
    <button
      className="restaurant-card"
      onClick={onClick}
    >
      <div className="restaurant-image">
        <img
          src={restaurant.image}
          alt={restaurant.name}
        />

        <span className="rating-badge">
          ⭐ {restaurant.rating}
        </span>
      </div>

      <div className="restaurant-info">
        <div className="restaurant-title-row">
          <h3>{restaurant.name}</h3>
          <span>{restaurant.category}</span>
        </div>

        <div className="restaurant-meta">
          <span>🕒 {restaurant.deliveryTime}</span>
          <span>
            🚴 Rs. {restaurant.deliveryFee}
          </span>
        </div>

        <div className="restaurant-tags">
          {restaurant.tags
            .slice(0, 3)
            .map(tag => (
              <span key={tag}>{tag}</span>
            ))}
        </div>
      </div>
    </button>
  )
}

function RestaurantPage({
  restaurant,
  menuItems,
  menuLoading,
  menuError,
  onBack,
  onAddToCart,
}: {
  restaurant: Restaurant
  menuItems: MenuItem[]
  menuLoading: boolean
  menuError: string
  onBack: () => void
  onAddToCart: (item: MenuItem) => void
}) 
 {
  const [menuCategory, setMenuCategory] =
    useState('All')

  const restaurantMenu = menuItems.filter(
    item => item.restaurantId === restaurant.id,
  )

  if (menuLoading) {
  return (
    <section className="restaurant-page">
      <button
        className="back-button"
        onClick={onBack}
      >
        ← Back to restaurants
      </button>

      <div className="empty-state">
        <h3>Loading menu...</h3>
        <p>Please wait while we load the menu.</p>
      </div>
    </section>
  )
}

if (menuError) {
  return (
    <section className="restaurant-page">
      <button
        className="back-button"
        onClick={onBack}
      >
        ← Back to restaurants
      </button>

      <div className="empty-state">
        <h3>Unable to load menu</h3>
        <p>{menuError}</p>
      </div>
    </section>
  )
}

  const menuCategories = [
    'All',
    ...Array.from(
      new Set(
        restaurantMenu.map(
          item => item.category,
        ),
      ),
    ),
  ]

  const filteredMenu =
    menuCategory === 'All'
      ? restaurantMenu
      : restaurantMenu.filter(
          item =>
            item.category === menuCategory,
        )

  return (
    <section className="restaurant-page">
      <button
        className="back-button"
        onClick={onBack}
      >
        ← Back to restaurants
      </button>

      <div className="restaurant-hero">
        <div className="restaurant-hero-image">
          <img
            src={restaurant.image}
            alt={restaurant.name}
          />
        </div>

        <div className="restaurant-hero-info">
          <span className="eyebrow">
            {restaurant.category.toUpperCase()}
          </span>

          <h1>{restaurant.name}</h1>

          <p>
            {restaurant.description}
          </p>

          <div className="restaurant-hero-meta">
            <span>
              ⭐ <strong>{restaurant.rating}</strong>
              <small> rating</small>
            </span>

            <span>
              🕒 <strong>
                {restaurant.deliveryTime}
              </strong>
            </span>

            <span>
              🚴 <strong>
                Rs. {restaurant.deliveryFee}
              </strong>
              <small> delivery</small>
            </span>
          </div>

          <div className="restaurant-tags-large">
            {restaurant.tags.map(tag => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="menu-section">
        <div className="section-header">
          <div>
            <span className="eyebrow">
              OUR MENU
            </span>

            <h2>Choose your favorites</h2>
          </div>
        </div>

        <div className="menu-filters">
          {menuCategories.map(category => (
            <button
              key={category}
              className={
                menuCategory === category
                  ? 'selected'
                  : ''
              }
              onClick={() =>
                setMenuCategory(category)
              }
            >
              {category}
            </button>
          ))}
        </div>

        <div className="menu-grid">
          {filteredMenu.map(item => (
            <div
              className="menu-item-card"
              key={item.id}
            >
              <img
                src={item.image}
                alt={item.name}
              />

              <div className="menu-item-content">
                <span className="menu-item-category">
                  {item.category}
                </span>

                <h3>{item.name}</h3>

                <p>{item.description}</p>

                <div className="menu-item-bottom">
                  <strong>
                    Rs. {item.price}
                  </strong>

                  <button
                    onClick={() =>
                      onAddToCart(item)
                    }
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default App
