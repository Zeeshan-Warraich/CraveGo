// All amounts and item details come from the database, never from the cart.
const priceOrder = async (supabase, input) => {
  const invalid = message => { throw Object.assign(new Error(message), { status: 400 }); };
  const { customerName, phone, address, notes = '', paymentMethod, items } = input || {};
  for (const [name, value, max] of [['name', customerName, 120], ['phone', phone, 40], ['address', address, 1000]]) {
    if (typeof value !== 'string' || !value.trim() || value.length > max) invalid(`Please enter a valid ${name}.`);
  }
  if (typeof notes !== 'string' || notes.length > 2000) invalid('Notes must be under 2000 characters.');
  if (paymentMethod !== 'Cash on Delivery') invalid('Please select Cash on Delivery.');
  if (!Array.isArray(items) || !items.length || items.length > 100) invalid('Your cart must contain between 1 and 100 items.');
  const deliveryLocation = input.deliveryLocation ?? null;
  if (deliveryLocation !== null && (
    typeof deliveryLocation !== 'object' || Array.isArray(deliveryLocation) ||
    typeof deliveryLocation.lat !== 'number' || !Number.isFinite(deliveryLocation.lat) || Math.abs(deliveryLocation.lat) > 90 ||
    typeof deliveryLocation.lng !== 'number' || !Number.isFinite(deliveryLocation.lng) || Math.abs(deliveryLocation.lng) > 180
  )) invalid('Please choose a valid delivery pin or remove the pin.');
  const coordinates = deliveryLocation === null ? null : { lat: deliveryLocation.lat, lng: deliveryLocation.lng };
  const quantities = new Map();
  for (const item of items) {
    if (!item || !Number.isSafeInteger(item.itemId) || item.itemId <= 0 ||
        !Number.isSafeInteger(item.quantity) || item.quantity <= 0 || item.quantity > 99) invalid('Invalid cart item or quantity.');
    const quantity = (quantities.get(item.itemId) || 0) + item.quantity;
    if (quantity > 99) invalid('Maximum quantity is 99 per menu item.');
    quantities.set(item.itemId, quantity);
  }
  const { data: menu, error: menuError } = await supabase.from('menu_items')
    .select('id, restaurant_id, name, price, image').in('id', [...quantities.keys()]);
  if (menuError) throw menuError;
  if (!menu || menu.length !== quantities.size) invalid('A menu item is no longer available. Refresh the page and rebuild your cart.');
  const restaurantIds = [...new Set(menu.map(item => Number(item.restaurant_id)))];
  const { data: restaurants, error: restaurantError } = await supabase.from('restaurants')
    .select('id, delivery_fee').in('id', restaurantIds);
  if (restaurantError) throw restaurantError;
  if (!restaurants || restaurants.length !== restaurantIds.length) invalid('A restaurant is no longer available.');
  const cents = value => {
    const amount = Number(value);
    if (value === null || value === '' || !Number.isFinite(amount) || amount < 0 || amount > 10000000) {
      throw new Error('Invalid stored price');
    }
    return Math.round(amount * 100);
  };
  let subtotalCents = 0;
  const canonicalItems = menu.map(item => {
    const quantity = quantities.get(Number(item.id));
    const priceCents = cents(item.price);
    subtotalCents += priceCents * quantity;
    return { itemId: Number(item.id), restaurantId: Number(item.restaurant_id),
      name: item.name, price: priceCents / 100, quantity, image: item.image || '' };
  });
  const deliveryCents = restaurants.reduce((sum, restaurant) => sum + cents(restaurant.delivery_fee), 0);
  const totalCents = subtotalCents + deliveryCents;
  // Do not silently accept an amount different from what the customer reviewed.
  if (typeof input.total !== 'number' || !Number.isFinite(input.total) || Math.round(input.total * 100) !== totalCents) {
    throw Object.assign(new Error('Prices or delivery fees changed. Refresh the page and rebuild your cart before ordering.'), { status: 409 });
  }
  return { customerName: customerName.trim(), phone: phone.trim(), address: address.trim(),
    notes: notes.trim(), paymentMethod, items: canonicalItems, deliveryLocation: coordinates,
    subtotal: subtotalCents / 100, deliveryFee: deliveryCents / 100, total: totalCents / 100 };
};

module.exports = { priceOrder };
