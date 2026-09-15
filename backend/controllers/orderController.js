const supabase = require('../config/supabase');
const { priceOrder } = require('./orderPricing');

const createOrder = async (req, res) => {
  try {
    const {
      customerName,
      phone,
      address,
      notes,
      paymentMethod,
      subtotal,
      deliveryFee,
      total,
      items
    } = await priceOrder(supabase, req.body);

    const {
      data: order,
      error: orderError
    } = await supabase
      .from('orders')
      .insert({
        customer_email: req.user.email,
        customer_name: customerName,
        phone,
        address,
        notes: notes || '',
        payment_method: paymentMethod,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        status: 'Placed'
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order insert error:', orderError);

      return res.status(500).json({
        success: false,
        message: 'Failed to create order',
        error: orderError.message
      });
    }

    const orderItems = items.map(item => ({
      order_id: order.id,
      menu_item_id: item.itemId,
      restaurant_id: item.restaurantId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image
    }));

    const {
      error: itemsError
    } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error(
        'Order items insert error:',
        itemsError
      );

      const {
        error: cleanupError
      } = await supabase
        .from('orders')
        .delete()
        .eq('id', order.id);

      if (cleanupError) {
        console.error(
          'Incomplete order cleanup failed:',
          order.id,
          cleanupError.message
        );

        return res.status(500).json({
          success: false,
          message:
            `Order CG-${order.id} could not be completed. ` +
            'Contact support before trying again.'
        });
      }

      return res.status(500).json({
        success: false,
        message:
          'Unable to save your order. Please try again.'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        ...order,
        items
      }
    });

  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }

    console.error(
      'Create order server error:',
      error
    );

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getOrders = async (req, res) => {
  try {
    const {
      data,
      error
    } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq(
        'customer_email',
        req.user.email
      )
      .order('created_at', {
        ascending: false
      });

    if (error) {
      console.error(
        'Fetch orders error:',
        error
      );

      return res.status(500).json({
        success: false,
        message: 'Failed to fetch orders',
        error: error.message
      });
    }

    res.json({
      success: true,
      count: data.length,
      data
    });

  } catch (error) {
    console.error(
      'Get orders server error:',
      error
    );

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createOrder,
  getOrders
};