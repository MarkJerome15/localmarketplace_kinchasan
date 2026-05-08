const express = require("express");
const productController = require("../controllers/productController");
const authController = require("../controllers/authController"); // Import Auth

const router = express.Router();

router
  .route("/top-3-cheapest")
  .get(productController.aliasTopCheapest, productController.getAllProducts);

router
  .route("/product-category")
  .get(productController.getProductCategoryStats);

router
  .route("/")
  .get(authController.protect, productController.getAllProducts) // Secured GET all products
  .post(authController.protect, productController.createProduct);

router
  .route("/:id")
  .get(authController.protect, productController.getProduct)
  .patch(authController.protect, productController.updateProduct)
  .delete(
    authController.protect, 
    authController.restrictTo('admin'), // Only admins can delete
    productController.deleteProduct
  );

module.exports = router;