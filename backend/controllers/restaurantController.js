const supabase = require('../config/supabase');

const getRestaurants = async (req, res) => {
  try {
    const {
      data,
      error
    } = await supabase
      .from('restaurants')
      .select('*')
      .order('id', { ascending: true });

    console.log('Restaurants from Supabase:', data);
    console.log('Restaurant count:', data?.length);

    if (error) {
      console.error('Supabase error:', error);

      return res.status(500).json({
        success: false,
        message: 'Failed to fetch restaurants',
        error: error.message
      });
    }

    res.json({
      success: true,
      count: data.length,
      data
    });

  } catch (error) {
    console.error('Server error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getRestaurants
};