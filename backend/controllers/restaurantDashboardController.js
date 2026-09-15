const supabase = require('../config/supabase');

const getRestaurantDashboard = async (req, res) => {
  try {
    // Find the logged-in user and their restaurant
    const {
      data: user,
      error: userError
    } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        role,
        restaurant_id
      `)
      .eq('id', req.user.userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.restaurant_id) {
      return res.status(403).json({
        success: false,
        message: 'No restaurant is linked to this account'
      });
    }

    // Get restaurant information
    const {
      data: restaurant,
      error: restaurantError
    } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', user.restaurant_id)
      .single();

    if (restaurantError || !restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    // Get this restaurant's menu
    const {
      data: menuItems,
      error: menuError
    } = await supabase
      .from('menu_items')
      .select('*')
      .eq(
        'restaurant_id',
        user.restaurant_id
      )
      .order('id', {
        ascending: true
      });

    if (menuError) {
      console.error(
        'Restaurant menu error:',
        menuError
      );

      return res.status(500).json({
        success: false,
        message: 'Failed to load restaurant menu',
        error: menuError.message
      });
    }

    // Get only order items belonging to this restaurant
    const {
      data: orderItems,
      error: ordersError
    } = await supabase
      .from('order_items')
      .select(`
        id,
        order_id,
        menu_item_id,
        restaurant_id,
        name,
        price,
        quantity,
        image,

        orders (
          id,
          customer_name,
          customer_email,
          phone,
          address,
          delivery_latitude,
          delivery_longitude,
          notes,
          payment_method,
          status,
          created_at
        )
      `)
      .eq(
        'restaurant_id',
        user.restaurant_id
      );

    if (ordersError) {
      console.error(
        'Restaurant orders error:',
        ordersError
      );

      return res.status(500).json({
        success: false,
        message: 'Failed to load restaurant orders',
        error: ordersError.message
      });
    }

    // Group order items by order
    const ordersMap = new Map();

    for (const item of orderItems || []) {
      const order = item.orders;

      if (!order) {
        continue;
      }

      if (!ordersMap.has(order.id)) {
        ordersMap.set(order.id, {
          id: order.id,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          phone: order.phone,
          address: order.address,
          deliveryLatitude: order.delivery_latitude,
          deliveryLongitude: order.delivery_longitude,
          notes: order.notes || '',
          paymentMethod: order.payment_method,
          status: order.status,
          createdAt: order.created_at,
          restaurantSubtotal: 0,
          items: []
        });
      }

      const savedOrder =
        ordersMap.get(order.id);

      const price = Number(item.price);
      const quantity = Number(item.quantity);

      savedOrder.items.push({
        id: item.id,
        menuItemId: item.menu_item_id,
        name: item.name,
        price,
        quantity,
        image: item.image
      });

      savedOrder.restaurantSubtotal +=
        price * quantity;
    }

    const orders =
      Array.from(ordersMap.values())
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
        );

    const activeOrders =
      orders.filter(
        order =>
          order.status !== 'Delivered'
      ).length;

    const totalSales =
      orders.reduce(
        (total, order) =>
          total + order.restaurantSubtotal,
        0
      );

    res.json({
      success: true,

      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },

        restaurant,

        stats: {
          menuItems: menuItems.length,
          totalOrders: orders.length,
          activeOrders,
          totalSales
        },

        menuItems,

        orders
      }
    });

  } catch (error) {
    console.error(
      'Restaurant dashboard error:',
      error
    );

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getRestaurantDashboard
};