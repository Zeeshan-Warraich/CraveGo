const supabase = require('../config/supabase');

const getRestaurantId = async userId => {
  const {
    data: user,
    error
  } = await supabase
    .from('users')
    .select('restaurant_id')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw new Error('User not found');
  }

  if (!user.restaurant_id) {
    throw new Error(
      'No restaurant linked to this account'
    );
  }

  return Number(user.restaurant_id);
};

const updateOrderStatus = async (req, res) => {
  try {
    const restaurantId =
      await getRestaurantId(req.user.userId);

    const orderId =
      Number(req.params.id);

    const {
      status
    } = req.body || {};

    const allowedStatuses = [
      'Placed',
      'Preparing',
      'Out for delivery',
      'Delivered'
    ];

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status'
      });
    }

    const {
      data: orderItems,
      error: itemError
    } = await supabase
      .from('order_items')
      .select('order_id')
      .eq('order_id', orderId)
      .eq(
        'restaurant_id',
        restaurantId
      )
      .limit(1);

    if (itemError) {
      console.error(
        'Order ownership check error:',
        itemError
      );

      return res.status(500).json({
        success: false,
        message: 'Failed to verify order'
      });
    }

    if (!orderItems || orderItems.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          'Order not found for this restaurant'
      });
    }

    const {
      data,
      error
    } = await supabase
      .from('orders')
      .update({
        status
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error(
        'Update order status error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Failed to update order status',
        error: error.message
      });
    }

    res.json({
      success: true,
      message:
        'Order status updated successfully',
      data
    });

  } catch (error) {
    console.error(
      'Restaurant order status error:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  updateOrderStatus
};