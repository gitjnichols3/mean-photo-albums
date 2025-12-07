const express = require('express');
const router = express.Router();

const { getPublicAlbumBySlug } = require('../controllers/albumController');

// @route GET /api/public/albums/:slug
// @desc  Public read-only album by shareSlug
// @access Public
router.get('/albums/:slug', getPublicAlbumBySlug);

module.exports = router;
