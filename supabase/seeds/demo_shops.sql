-- ============================================================================
-- DEMO SEED: 10 men's barbershops + 10 women's salons (test data)
--
-- MANUAL script for the LIVE/staging DB — NOT auto-run by `supabase db reset`
-- (that only runs supabase/seed.sql). Run explicitly:
--   npx supabase db query --linked --file supabase/seeds/demo_shops.sql
--
-- All rows are attached to admin user 7cb518d2-d2dc-4167-9328-3549b8138920
-- (owns 0 real shops) so that owner_id is the cleanup handle. Idempotent
-- (self-cleans admin-owned shops first) + atomic. If run on another DB, swap
-- the admin UUID for a real users.id there first.
-- Cleanup: run the 4 DELETEs in the preamble below on their own.
-- ============================================================================
BEGIN;

-- Idempotent: clear any previous run of this demo seed (admin owns only test shops)
DELETE FROM shop_hours WHERE shop_id IN (SELECT id FROM shops WHERE owner_id = '7cb518d2-d2dc-4167-9328-3549b8138920');
DELETE FROM services   WHERE shop_id IN (SELECT id FROM shops WHERE owner_id = '7cb518d2-d2dc-4167-9328-3549b8138920');
DELETE FROM barbers    WHERE shop_id IN (SELECT id FROM shops WHERE owner_id = '7cb518d2-d2dc-4167-9328-3549b8138920');
DELETE FROM shops      WHERE owner_id = '7cb518d2-d2dc-4167-9328-3549b8138920';

-- ── Shops ──────────────────────────────────────────────────────────────────
INSERT INTO shops (owner_id,name,phone,address,city,state,pincode,segment,status,rating,review_count,is_featured,description) VALUES
-- Men
('7cb518d2-d2dc-4167-9328-3549b8138920','Kingsmen Barber Studio','9826000001','12 Vijay Nagar Main Rd','Indore','Madhya Pradesh','452010','men','verified',4.8,214,true,'Premium men''s grooming — fades, beards & classic shaves.'),
('7cb518d2-d2dc-4167-9328-3549b8138920','The Gentleman''s Cut','9826000002','5 New Palasia','Indore','Madhya Pradesh','452001','men','verified',4.7,168,true,'Sharp cuts and hot-towel shaves for the modern man.'),
('7cb518d2-d2dc-4167-9328-3549b8138920','Sharp & Co. Grooming','9826000003','88 Sapna Sangeeta Rd','Indore','Madhya Pradesh','452001','men','verified',4.6,142,false,'Fades, colour and beard sculpting by expert barbers.'),
('7cb518d2-d2dc-4167-9328-3549b8138920','Fadez Urban Barbers','9826000004','23 Bhawarkuan Sq','Indore','Madhya Pradesh','452001','men','verified',4.5,98,false,'Urban street-style fades and line-ups.'),
('7cb518d2-d2dc-4167-9328-3549b8138920','Royal Trim Barbershop','9826000005','1 Rajwada Palace Rd','Indore','Madhya Pradesh','452002','men','verified',4.9,231,true,'Heritage barbershop — royal shaves and classic cuts.'),
('7cb518d2-d2dc-4167-9328-3549b8138920','Blade & Fade','9826000006','44 Sudama Nagar','Indore','Madhya Pradesh','452009','men','verified',4.3,76,false,'Clean undercuts, beard designs and quick trims.'),
('7cb518d2-d2dc-4167-9328-3549b8138920','The Dapper Den','9826000007','9 Saket Nagar','Indore','Madhya Pradesh','452018','men','verified',4.6,121,false,'Textured crops, pompadours and grooming for gents.'),
('7cb518d2-d2dc-4167-9328-3549b8138920','Executive Cuts','9826000008','200 MG Road','Indore','Madhya Pradesh','452001','men','verified',4.4,64,false,'Smart executive cuts and grey blending.'),
('7cb518d2-d2dc-4167-9328-3549b8138920','Ustaad Barber House','9826000009','7 Geeta Bhawan Sq','Indore','Madhya Pradesh','452001','men','verified',4.7,155,false,'Old-school ustaad craft — beard art and hot-towel shaves.'),
('7cb518d2-d2dc-4167-9328-3549b8138920','Metro Men''s Salon','9826000010','31 Palasia Main Rd','Indore','Madhya Pradesh','452001','men','verified',4.2,51,false,'Quick, affordable cuts and trims for men on the go.'),
-- Women
('7cb518d2-d2dc-4167-9328-3549b8138920','Glamour Studio','9826000011','14 Vijay Nagar Main Rd','Indore','Madhya Pradesh','452010','women','verified',4.8,198,true,'Beauty, bridal and hair spa for women.'),
('7cb518d2-d2dc-4167-9328-3549b8138920','Bloom Beauty Lounge','9826000012','6 New Palasia','Indore','Madhya Pradesh','452001','women','verified',4.7,176,true,'Facials, waxing, colour and nail art in a calm lounge.'),
('7cb518d2-d2dc-4167-9328-3549b8138920','Velvet & Rose Salon','9826000013','90 Sapna Sangeeta Rd','Indore','Madhya Pradesh','452001','women','verified',4.9,242,true,'Luxury bridal makeup and keratin hair spa.'),
('7cb518d2-d2dc-4167-9328-3549b8138920','Serene Beauty Bar','9826000014','25 Bhawarkuan Sq','Indore','Madhya Pradesh','452001','women','verified',4.5,89,false,'Relaxing facials, clean-ups and threading.'),
('7cb518d2-d2dc-4167-9328-3549b8138920','Blush Glow Studio','9826000015','3 Rajwada Palace Rd','Indore','Madhya Pradesh','452002','women','verified',4.6,133,false,'Makeup, nails, hair colour and glow facials.'),
('7cb518d2-d2dc-4167-9328-3549b8138920','The Bombshell Salon','9826000016','46 Sudama Nagar','Indore','Madhya Pradesh','452009','women','verified',4.4,71,false,'Waxing, facials and threading done right.'),
('7cb518d2-d2dc-4167-9328-3549b8138920','Elegance Beauty Spa','9826000017','11 Saket Nagar','Indore','Madhya Pradesh','452018','women','verified',4.7,149,false,'Bridal makeup, saree draping and spa facials.'),
('7cb518d2-d2dc-4167-9328-3549b8138920','Petal & Poise','9826000018','210 MG Road','Indore','Madhya Pradesh','452001','women','verified',4.5,102,false,'Nail art, waxing and threading studio.'),
('7cb518d2-d2dc-4167-9328-3549b8138920','Luxe Ladies Salon','9826000019','8 Geeta Bhawan Sq','Indore','Madhya Pradesh','452001','women','verified',4.8,187,false,'Full-service ladies salon — bridal, colour and spa.'),
('7cb518d2-d2dc-4167-9328-3549b8138920','Radiance Beauty Studio','9826000020','33 Palasia Main Rd','Indore','Madhya Pradesh','452001','women','verified',4.3,58,false,'Everyday facials, threading and clean-ups.');

-- ── Staff (2 per shop) ───────────────────────────────────────────────────────
INSERT INTO barbers (shop_id,name,rating,review_count,specialties,is_active)
SELECT s.id, v.bname, v.brate, v.brev, v.bspec, true
FROM (VALUES
  ('Kingsmen Barber Studio','Rahul Verma',4.9,180,ARRAY['Skin Fade','Beard Sculpt']),
  ('Kingsmen Barber Studio','Amit Sharma',4.7,120,ARRAY['Classic Cut','Hot Towel Shave']),
  ('The Gentleman''s Cut','Vikas Nair',4.8,140,ARRAY['Pompadour','Beard Trim']),
  ('The Gentleman''s Cut','Suresh Rao',4.5,90,ARRAY['Kids Cut','Buzz Cut']),
  ('Sharp & Co. Grooming','Deepak Joshi',4.6,110,ARRAY['Fade','Hair Colour']),
  ('Sharp & Co. Grooming','Arjun Mehta',4.4,70,ARRAY['Crew Cut','Shave']),
  ('Fadez Urban Barbers','Karan Singh',4.7,130,ARRAY['Taper Fade','Line Up']),
  ('Fadez Urban Barbers','Manish Yadav',4.3,60,ARRAY['Scissor Cut','Beard']),
  ('Royal Trim Barbershop','Sanjay Gupta',4.9,205,ARRAY['Royal Shave','Classic Cut']),
  ('Royal Trim Barbershop','Rohit Malhotra',4.6,115,ARRAY['Fade','Styling']),
  ('Blade & Fade','Ajay Kumar',4.4,80,ARRAY['Undercut','Beard Design']),
  ('Blade & Fade','Nikhil Jain',4.2,50,ARRAY['Kids Cut','Trim']),
  ('The Dapper Den','Ravi Chauhan',4.7,125,ARRAY['Textured Crop','Beard']),
  ('The Dapper Den','Sameer Khan',4.5,85,ARRAY['Pompadour','Shave']),
  ('Executive Cuts','Anil Kapoor',4.4,60,ARRAY['Executive Cut','Grey Blending']),
  ('Executive Cuts','Prakash Iyer',4.3,45,ARRAY['Classic Cut','Trim']),
  ('Ustaad Barber House','Imran Sheikh',4.8,160,ARRAY['Ustaad Special','Beard Art']),
  ('Ustaad Barber House','Faizal Ansari',4.6,100,ARRAY['Fade','Hot Towel']),
  ('Metro Men''s Salon','Naveen Reddy',4.3,55,ARRAY['Quick Cut','Beard']),
  ('Metro Men''s Salon','Gaurav Saxena',4.1,40,ARRAY['Buzz Cut','Trim']),
  ('Glamour Studio','Priya Kapoor',4.9,175,ARRAY['Bridal Makeup','Hair Spa']),
  ('Glamour Studio','Neha Sharma',4.7,110,ARRAY['Facial','Threading']),
  ('Bloom Beauty Lounge','Pooja Verma',4.8,150,ARRAY['Waxing','Nail Art']),
  ('Bloom Beauty Lounge','Anjali Nair',4.6,95,ARRAY['Hair Colour','Facial']),
  ('Velvet & Rose Salon','Sneha Rao',4.9,220,ARRAY['Bridal','Makeup']),
  ('Velvet & Rose Salon','Kavya Menon',4.7,130,ARRAY['Hair Spa','Keratin']),
  ('Serene Beauty Bar','Ritu Joshi',4.5,85,ARRAY['Facial','Clean-up']),
  ('Serene Beauty Bar','Divya Mehta',4.4,65,ARRAY['Threading','Waxing']),
  ('Blush Glow Studio','Meera Iyer',4.6,120,ARRAY['Makeup','Nail Art']),
  ('Blush Glow Studio','Simran Kaur',4.5,80,ARRAY['Hair Colour','Spa']),
  ('The Bombshell Salon','Nisha Gupta',4.4,70,ARRAY['Waxing','Facial']),
  ('The Bombshell Salon','Aarti Malhotra',4.3,55,ARRAY['Threading','Clean-up']),
  ('Elegance Beauty Spa','Ishita Jain',4.7,135,ARRAY['Bridal Makeup','Draping']),
  ('Elegance Beauty Spa','Tanvi Chauhan',4.6,100,ARRAY['Facial','Spa']),
  ('Petal & Poise','Riya Khan',4.5,95,ARRAY['Nail Art','Waxing']),
  ('Petal & Poise','Shreya Reddy',4.4,75,ARRAY['Threading','Facial']),
  ('Luxe Ladies Salon','Ananya Kapoor',4.8,170,ARRAY['Bridal','Hair Spa']),
  ('Luxe Ladies Salon','Diksha Saxena',4.6,105,ARRAY['Makeup','Colour']),
  ('Radiance Beauty Studio','Payal Sheikh',4.3,55,ARRAY['Facial','Threading']),
  ('Radiance Beauty Studio','Komal Ansari',4.2,42,ARRAY['Waxing','Clean-up'])
) AS v(shop_name,bname,brate,brev,bspec)
JOIN shops s ON s.name = v.shop_name AND s.owner_id = '7cb518d2-d2dc-4167-9328-3549b8138920';

-- ── Services (each shop gets its segment's 4) ────────────────────────────────
INSERT INTO services (shop_id,name,category,duration_min,price,is_active,is_addon)
SELECT s.id, v.sname, v.scat, v.sdur, v.sprice, true, false
FROM (VALUES
  ('men','Haircut','hair',30,150),
  ('men','Beard Trim & Shape','beard',30,100),
  ('men','Hair + Beard Combo','combo',45,220),
  ('men','Kids Haircut','kids',30,120),
  ('women','Classic Facial','facial',45,600),
  ('women','Full Arm Waxing','waxing',30,400),
  ('women','Eyebrow Threading','threading',15,50),
  ('women','Bridal Makeup','bridal',90,3500)
) AS v(seg,sname,scat,sdur,sprice)
JOIN shops s ON s.segment = v.seg AND s.owner_id = '7cb518d2-d2dc-4167-9328-3549b8138920';

-- ── Hours (Mon–Sun 10:00–20:00) ──────────────────────────────────────────────
INSERT INTO shop_hours (shop_id,day_of_week,open_time,close_time)
SELECT s.id, d, TIME '10:00', TIME '20:00'
FROM shops s CROSS JOIN generate_series(0,6) AS d
WHERE s.owner_id = '7cb518d2-d2dc-4167-9328-3549b8138920';

COMMIT;

-- Verify
SELECT segment, count(*) AS shops FROM shops WHERE owner_id='7cb518d2-d2dc-4167-9328-3549b8138920' GROUP BY segment ORDER BY segment;
