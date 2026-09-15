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


// CREATE MENU ITEM
const createMenuItem = async (req, res) => {
  try {
    const restaurantId =
      await getRestaurantId(req.user.userId);

    const {
      name,
      category,
      description,
      price,
      image
    } = req.body;

    if (
      !name ||
      !category ||
      price === undefined ||
      price === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Name, category and price are required'
      });
    }

    const numericPrice = Number(price);

    if (
      Number.isNaN(numericPrice) ||
      numericPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a valid number'
      });
    }

    const {
      data,
      error
    } = await supabase
      .from('menu_items')
      .insert({
        restaurant_id: restaurantId,
        name: name.trim(),
        category: category.trim(),
        description:
          description?.trim() || '',
        price: numericPrice,
        image: image?.trim() || null
      })
      .select()
      .single();

    if (error) {
      console.error(
        'Create menu item error:',
        error
      );

      return res.status(500).json({
        success: false,
        message: 'Failed to create menu item',
        error: error.message
      });
    }

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data
    });

  } catch (error) {
    console.error(
      'Create restaurant menu error:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// UPDATE MENU ITEM
const updateMenuItem = async (req, res) => {
  try {
    const restaurantId =
      await getRestaurantId(req.user.userId);

    const menuItemId =
      Number(req.params.id);

    if (Number.isNaN(menuItemId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid menu item ID'
      });
    }

    const {
      data: existingItem,
      error: findError
    } = await supabase
      .from('menu_items')
      .select('id')
      .eq('id', menuItemId)
      .eq(
        'restaurant_id',
        restaurantId
      )
      .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message:
          'Menu item not found for this restaurant'
      });
    }

    const {
      name,
      category,
      description,
      price,
      image
    } = req.body;

    const updates = {};

    if (name !== undefined) {
      updates.name = name.trim();
    }

    if (category !== undefined) {
      updates.category = category.trim();
    }

    if (description !== undefined) {
      updates.description =
        description.trim();
    }

    if (image !== undefined) {
      updates.image =
        image?.trim() || null;
    }

    if (price !== undefined) {
      const numericPrice =
        Number(price);

      if (
        Number.isNaN(numericPrice) ||
        numericPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Price must be a valid number'
        });
      }

      updates.price =
        numericPrice;
    }

    if (
      Object.keys(updates).length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'No menu item changes provided'
      });
    }

    const {
      data,
      error
    } = await supabase
      .from('menu_items')
      .update(updates)
      .eq('id', menuItemId)
      .eq(
        'restaurant_id',
        restaurantId
      )
      .select()
      .single();

    if (error) {
      console.error(
        'Update menu item error:',
        error
      );

      return res.status(500).json({
        success: false,
        message: 'Failed to update menu item',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Menu item updated successfully',
      data
    });

  } catch (error) {
    console.error(
      'Update restaurant menu error:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// DELETE MENU ITEM
const deleteMenuItem = async (req, res) => {
  try {
    const restaurantId =
      await getRestaurantId(req.user.userId);

    const menuItemId =
      Number(req.params.id);

    if (Number.isNaN(menuItemId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid menu item ID'
      });
    }

    const {
      data: existingItem,
      error: findError
    } = await supabase
      .from('menu_items')
      .select('id, name')
      .eq('id', menuItemId)
      .eq(
        'restaurant_id',
        restaurantId
      )
      .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message:
          'Menu item not found for this restaurant'
      });
    }

    const {
      error
    } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', menuItemId)
      .eq(
        'restaurant_id',
        restaurantId
      );

    if (error) {
      console.error(
        'Delete menu item error:',
        error
      );

      return res.status(500).json({
        success: false,
        message: 'Failed to delete menu item',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Menu item deleted successfully'
    });

  } catch (error) {
    console.error(
      'Delete restaurant menu error:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


module.exports = {
  createMenuItem,
  updateMenuItem,
  deleteMenuItem
};