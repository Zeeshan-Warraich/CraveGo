const supabase = require('../config/supabase');

// Check the database too, so a revoked admin role cannot use an older JWT.
const requireAdmin = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('users')
      .select('id, role').eq('id', req.user.userId).maybeSingle();
    if (error) throw error;
    if (!data || data.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
  } catch (error) {
    console.error('Admin access check failed:', error.message);
    res.status(500).json({ success: false, message: 'Unable to verify admin access' });
  }
};

const handle = fn => async (req, res) => {
  try { await fn(req, res); } catch (error) {
    console.error('Admin API error:', error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : 'Unable to complete admin request. Please try again.',
    });
  }
};
const invalid = message => { throw Object.assign(new Error(message), { status: 400 }); };
const unwrap = result => { if (result.error) throw result.error; return result; };
const pageOptions = req => {
  const page = Number(req.query.page || 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) invalid('Invalid page');
  // Only allow literal search words, excluding PostgREST filter syntax and wildcards.
  const search = String(req.query.search || '').trim().slice(0, 100)
    .replace(/[^\p{L}\p{N}\s@.+-]/gu, '').trim();
  return { page, search, from: (page - 1) * 20, to: page * 20 - 1 };
};
const sendPage = (res, result, page) => {
  unwrap(result);
  res.json({ success: true, data: { items: result.data || [], total: result.count || 0, page, pageSize: 20 } });
};

const getOverview = handle(async (_req, res) => {
  const results = await Promise.all([
    supabase.from('restaurants').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true })
      .in('status', ['Placed', 'Preparing', 'Out for delivery']),
  ]);
  results.forEach(unwrap);
  res.json({ success: true, data: {
    restaurants: results[0].count || 0, users: results[1].count || 0,
    orders: results[2].count || 0, activeOrders: results[3].count || 0,
  } });
});

const listRestaurants = handle(async (req, res) => {
  const { page, search, from, to } = pageOptions(req);
  let query = supabase.from('restaurants').select(
    'id, name, category, description, image, rating, delivery_time, delivery_fee, tags', { count: 'exact' },
  );
  if (search) query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%`);
  sendPage(res, await query.order('id', { ascending: false }).range(from, to), page);
});

const listUsers = handle(async (req, res) => {
  const { page, search, from, to } = pageOptions(req);
  // Explicit fields prevent passwords and password hashes from leaving the server.
  let query = supabase.from('users').select('id, name, email, role, restaurant_id', { count: 'exact' });
  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  sendPage(res, await query.order('id', { ascending: false }).range(from, to), page);
});

const listOrders = handle(async (req, res) => {
  const { page, search, from, to } = pageOptions(req);
  let query = supabase.from('orders').select(`
    id, customer_name, customer_email, phone, address, notes, payment_method,
    status, created_at, total, delivery_latitude, delivery_longitude,
    order_items(id, restaurant_id, name, quantity, price)
  `, { count: 'exact' });
  if (search) query = query.or(`customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`);
  if (req.query.status) {
    if (!['Placed', 'Preparing', 'Out for delivery', 'Delivered'].includes(req.query.status)) invalid('Invalid status');
    query = query.eq('status', req.query.status);
  }
  sendPage(res, await query.order('created_at', { ascending: false })
    .order('id', { ascending: false }).range(from, to), page);
});

const restaurantInput = body => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) invalid('Restaurant details are required');
  const text = (key, required, max) => {
    if (typeof body[key] !== 'string') invalid(`Invalid ${key}`);
    const value = body[key].trim();
    if ((required && !value) || value.length > max) invalid(`Please enter a valid ${key.replaceAll('_', ' ')}`);
    return value;
  };
  const number = (key, max) => {
    if (!['string', 'number'].includes(typeof body[key]) || String(body[key]).trim() === '') invalid(`Invalid ${key}`);
    const value = Number(body[key]);
    if (!Number.isFinite(value) || value < 0 || value > max) invalid(`Invalid ${key.replaceAll('_', ' ')}`);
    return value;
  };
  const image = text('image', false, 2048);
  if (image) {
    try { if (!['http:', 'https:'].includes(new URL(image).protocol)) invalid('Image must use an http or https URL'); }
    catch { invalid('Please enter a valid image URL'); }
  }
  if (!Array.isArray(body.tags) || body.tags.length > 10 ||
      body.tags.some(tag => typeof tag !== 'string' || !tag.trim() || tag.trim().length > 40)) invalid('Use up to 10 tags, each under 40 characters');
  return {
    name: text('name', true, 120), category: text('category', true, 60),
    description: text('description', false, 2000), image,
    delivery_time: text('delivery_time', true, 60),
    delivery_fee: number('delivery_fee', 100000), rating: number('rating', 5),
    tags: [...new Set(body.tags.map(tag => tag.trim()))],
  };
};
const saveRestaurant = handle(async (req, res) => {
  const input = restaurantInput(req.body);
  let query;
  if (req.params.id !== undefined) {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) invalid('Invalid restaurant ID');
    query = supabase.from('restaurants').update(input).eq('id', id);
  } else {
    query = supabase.from('restaurants').insert(input);
  }
  const { data } = unwrap(await query.select('id, name, category, description, image, rating, delivery_time, delivery_fee, tags').maybeSingle());
  if (!data) return res.status(404).json({ success: false, message: 'Restaurant not found' });
  res.status(req.params.id === undefined ? 201 : 200).json({ success: true, data });
});

module.exports = { requireAdmin, getOverview, listRestaurants, listUsers, listOrders, saveRestaurant };
