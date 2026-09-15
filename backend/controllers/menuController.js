const supabase = require('../config/supabase');

const getMenuItems = async (req, res) => {
  try {
    const { restaurant_id } = req.query;

    let query = supabase
      .from('menu_items')
      .select('*')
      .order('id', { ascending: true });

    // If a restaurant ID is provided,
    // only return that restaurant's menu.
    if (restaurant_id) {
      query = query.eq('restaurant_id', restaurant_id);
    }

    const {
      data,
      error
    } = await query;

    if (error) {
      console.error('Supabase menu error:', error);

      return res.status(500).json({
        success: false,
        message: 'Failed to fetch menu items',
        error: error.message
      });
    }

    res.json({
      success: true,
      count: data.length,
      data
    });

  } catch (error) {
    console.error('Server menu error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getMenuItems
};