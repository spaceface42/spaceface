-- ============================================================================
-- SQL COMMANDS TO LIST ALL PROJECTS
-- ============================================================================

-- 1. SIMPLE LIST - Basic project information
-- ============================================================================
SELECT 
    id,
    title,
    type,
    category,
    client,
    year,
    featured
FROM projects
ORDER BY display_order, created_at DESC;


-- 2. DETAILED LIST - Projects with media count and tags
-- ============================================================================
SELECT 
    p.id,
    p.title,
    p.slug,
    p.description,
    p.type,
    p.category,
    p.client,
    p.year,
    p.featured,
    COUNT(DISTINCT m.id) as media_count,
    GROUP_CONCAT(DISTINCT t.name, ', ') as tags,
    p.created_at
FROM projects p
LEFT JOIN media m ON p.id = m.project_id
LEFT JOIN project_tags pt ON p.id = pt.project_id
LEFT JOIN tags t ON pt.tag_id = t.id
GROUP BY p.id
ORDER BY p.display_order, p.created_at DESC;


-- 3. USE THE OPTIMIZED VIEW - Fastest way (recommended)
-- ============================================================================
SELECT * FROM projects_summary;


-- 4. FEATURED PROJECTS ONLY
-- ============================================================================
SELECT * FROM featured_projects;


-- 5. PROJECTS BY CATEGORY
-- ============================================================================
SELECT 
    id,
    title,
    type,
    client,
    year
FROM projects
WHERE category = 'branding'  -- Change to: motion, web, print, etc.
ORDER BY year DESC;


-- 6. PROJECTS WITH COVER IMAGES
-- ============================================================================
SELECT 
    p.id,
    p.title,
    p.category,
    p.year,
    m.file_path as cover_image,
    m.thumbnail_path as cover_thumbnail
FROM projects p
LEFT JOIN media m ON p.id = m.project_id AND m.is_cover = 1
ORDER BY p.display_order;


-- 7. RECENT PROJECTS (LAST 10)
-- ============================================================================
SELECT 
    id,
    title,
    type,
    category,
    year,
    created_at
FROM projects
ORDER BY created_at DESC
LIMIT 10;


-- 8. PROJECTS WITH STATISTICS
-- ============================================================================
SELECT 
    p.id,
    p.title,
    p.type,
    p.category,
    COUNT(DISTINCT m.id) as total_media,
    SUM(CASE WHEN m.media_type = 'image' THEN 1 ELSE 0 END) as image_count,
    SUM(CASE WHEN m.media_type = 'video' THEN 1 ELSE 0 END) as video_count,
    COUNT(DISTINCT pt.tag_id) as tag_count
FROM projects p
LEFT JOIN media m ON p.id = m.project_id
LEFT JOIN project_tags pt ON p.id = pt.project_id
GROUP BY p.id
ORDER BY p.display_order;


-- 9. PROJECTS BY YEAR
-- ============================================================================
SELECT 
    year,
    COUNT(*) as project_count,
    GROUP_CONCAT(title, ' | ') as projects
FROM projects
WHERE year IS NOT NULL
GROUP BY year
ORDER BY year DESC;


-- 10. SEARCH PROJECTS
-- ============================================================================
SELECT 
    id,
    title,
    description,
    category,
    client
FROM projects
WHERE 
    title LIKE '%logo%'           -- Search in title
    OR description LIKE '%logo%'  -- Search in description
    OR client LIKE '%logo%'       -- Search in client name
ORDER BY featured DESC, created_at DESC;


-- 11. EXPORT TO CSV FORMAT (comma-separated)
-- ============================================================================
.mode csv
.headers on
.output projects_export.csv
SELECT 
    id,
    title,
    type,
    category,
    client,
    year,
    featured,
    created_at
FROM projects
ORDER BY display_order;
.output stdout


-- 12. PRETTY TABLE FORMAT
-- ============================================================================
.mode table
.headers on
SELECT 
    id,
    title,
    type,
    category,
    COALESCE(client, 'Personal') as client,
    year,
    CASE WHEN featured = 1 THEN '⭐' ELSE '' END as featured
FROM projects
ORDER BY display_order;


-- 13. JSON FORMAT (for APIs)
-- ============================================================================
.mode json
SELECT 
    id,
    title,
    slug,
    type,
    category,
    client,
    year,
    featured,
    created_at
FROM projects
ORDER BY display_order;


-- 14. COUNT PROJECTS BY CATEGORY
-- ============================================================================
SELECT 
    category,
    COUNT(*) as count,
    SUM(CASE WHEN featured = 1 THEN 1 ELSE 0 END) as featured_count
FROM projects
GROUP BY category
ORDER BY count DESC;


-- 15. LIST ALL PROJECT TITLES ONLY (quick view)
-- ============================================================================
SELECT title FROM projects ORDER BY display_order;
