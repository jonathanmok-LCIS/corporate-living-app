# Manual Testing Guide - Image Compression Feature

## Overview
This guide provides step-by-step instructions for manually testing the new client-side image compression feature.

## Prerequisites
1. Supabase project configured
2. Storage bucket `move-out-photos` created and configured with public access
3. Tenant user account with active tenancy
4. Test images of various sizes

## Test Preparation

### 1. Prepare Test Images
Create or download test images with various characteristics:

- **Small image**: 500KB JPEG (should compress minimally)
- **Medium image**: 2-3MB JPEG (should compress to ~500KB)
- **Large image**: 5-8MB JPEG (should compress to ~700KB)
- **Very large image**: 15-20MB JPEG (should compress to <1MB with quality reduction)
- **Portrait photo**: iPhone/Android photo with EXIF orientation (test orientation preservation)
- **Different formats**: PNG, HEIC (if available)

### 2. Browser Setup
- Open browser Developer Tools (F12)
- Go to Console tab to see compression logs
- Go to Network tab to monitor uploads

## Test Cases

### Test 1: Single Photo Upload - Medium Size

**Steps:**
1. Login as tenant user
2. Navigate to `/tenant/move-out`
3. Click "General Condition Photos" file input
4. Select a 2-3MB JPEG image
5. Observe the process

**Expected Results:**
- ✅ Console shows: "Compressing photo 1 of 1..."
- ✅ Console shows compression stats:
  ```
  Compression successful on attempt 1:
  - originalSize: "2.5 MB"
  - compressedSize: "512.3 KB"
  - reduction: "80%"
  - options: {maxWidthOrHeight: 1600, quality: 0.8}
  ```
- ✅ UI shows: "⏳ Compressing photo 1 of 1..."
- ✅ UI shows: "⏳ Uploading..."
- ✅ Alert: "1 photo(s) uploaded successfully!"
- ✅ UI shows: "✓ 1 photo(s) uploaded"
- ✅ Network tab shows upload to Supabase Storage
- ✅ File uploaded is WebP format (~500KB)

### Test 2: Multiple Photos Upload - Mixed Sizes

**Steps:**
1. Login as tenant user
2. Navigate to `/tenant/move-out`
3. Click "General Condition Photos" file input
4. Select 5 images of various sizes (500KB, 2MB, 5MB, 8MB, 1MB)
5. Observe the process

**Expected Results:**
- ✅ Console shows compression progress for each photo
- ✅ UI shows: "⏳ Compressing photo 1 of 5...", "2 of 5...", etc.
- ✅ All photos compressed to <1MB
- ✅ Alert: "5 photo(s) uploaded successfully!"
- ✅ UI shows: "✓ 5 photo(s) uploaded"
- ✅ Network tab shows 5 separate uploads to Storage

### Test 3: Large Photo Requiring Quality Reduction

**Steps:**
1. Login as tenant user
2. Navigate to `/tenant/move-out`
3. Select a very large image (15-20MB, high resolution)
4. Observe compression attempts

**Expected Results:**
- ✅ Console shows multiple compression attempts:
  ```
  Attempt 1 still too large (1.2 MB), trying next...
  Compression successful on attempt 2:
  - originalSize: "18.5 MB"
  - compressedSize: "892.1 KB"
  - reduction: "95%"
  - options: {maxWidthOrHeight: 1600, quality: 0.7}
  ```
- ✅ Photo successfully compressed and uploaded
- ✅ Final size <1MB

### Test 4: Maximum Photos Validation

**Steps:**
1. Login as tenant user
2. Navigate to `/tenant/move-out`
3. Select 11 images (exceeds MAX_PHOTOS_PER_SECTION = 10)

**Expected Results:**
- ✅ Alert: "Maximum 10 photos allowed per section."
- ✅ File input reset (no files selected)
- ✅ No compression or upload occurs

### Test 5: Invalid File Type

**Steps:**
1. Login as tenant user
2. Navigate to `/tenant/move-out`
3. Select a PDF or text file

**Expected Results:**
- ✅ Alert: "Please select only image files (JPEG, PNG, WebP, or HEIC)."
- ✅ File input reset
- ✅ No compression or upload occurs

### Test 6: Extremely Large Photo (Compression Failure)

**Steps:**
1. Create or find an extremely large, high-resolution image (>50MB)
2. Navigate to `/tenant/move-out`
3. Select the image

**Expected Results:**
- ✅ Console shows all 4 compression attempts
- ✅ Alert: "Unable to compress image to under 1MB. Original size: 52.3 MB. Please choose a smaller image or take a new photo."
- ✅ File input reset
- ✅ No upload occurs

### Test 7: EXIF Orientation Preservation

**Steps:**
1. Get a portrait photo from iPhone/Android (has EXIF rotation)
2. Navigate to `/tenant/move-out`
3. Select the photo
4. After upload, verify in Storage

**Expected Results:**
- ✅ Photo compresses successfully
- ✅ Photo uploads to Storage
- ✅ Photo displays with correct orientation (not rotated)

### Test 8: Both Sections - Key Area and Damage Photos

**Steps:**
1. Login as tenant user
2. Navigate to `/tenant/move-out`
3. Upload 3 photos to "General Condition Photos"
4. Upload 2 photos to "Damage/Stain Photos"
5. Fill out rest of form
6. Submit

**Expected Results:**
- ✅ Both photo sets compress and upload independently
- ✅ UI shows correct counts for each section
- ✅ Form submits successfully
- ✅ Server Action receives photo URLs (not base64)
- ✅ Database stores 3 URLs in `key_area_photos` array
- ✅ Database stores 2 URLs in `damage_photos` array

### Test 9: Form Submission After Upload

**Steps:**
1. Login as tenant user
2. Navigate to `/tenant/move-out`
3. Upload photos (compresses and uploads immediately)
4. Fill out required fields:
   - Planned move-out date
   - Rent paid up: Yes
   - Areas cleaned: Yes
   - Has damage: No
5. Submit form

**Expected Results:**
- ✅ Form submits quickly (<1 second)
- ✅ No photo upload delay during submission
- ✅ Success message shown
- ✅ Redirects to success page
- ✅ Database record created with photo URLs

### Test 10: Network Failure Handling

**Steps:**
1. Open Network tab in DevTools
2. Enable "Offline" mode or throttle to slow connection
3. Navigate to `/tenant/move-out`
4. Select photos
5. Observe behavior

**Expected Results:**
- ✅ Compression still works (client-side)
- ✅ Upload fails with clear error
- ✅ Error message shows: "Failed to upload {filename}: {error}"
- ✅ User can retry by selecting photos again

### Test 11: Concurrent Uploads

**Steps:**
1. Navigate to `/tenant/move-out`
2. Quickly select photos for both "General" and "Damage" sections
3. Observe behavior

**Expected Results:**
- ✅ Only one section processes at a time (inputs disabled)
- ✅ Second upload waits for first to complete
- ✅ No conflicts or errors

### Test 12: Mobile Device Testing

**Steps:**
1. Open app on mobile device or use DevTools mobile emulation
2. Navigate to `/tenant/move-out`
3. Take photo with camera OR select from gallery
4. Upload photo

**Expected Results:**
- ✅ Camera/gallery works correctly
- ✅ Compression works on mobile
- ✅ Upload completes
- ✅ UI responsive and clear
- ✅ Progress indicators visible

## Verification Checklist

After running tests, verify:

### Client-Side
- [ ] Compression reduces file sizes significantly (70-90%)
- [ ] All compressed files are WebP format
- [ ] All compressed files are <1MB
- [ ] Console logs show compression stats
- [ ] UI shows progress indicators
- [ ] Error messages are clear and helpful

### Storage
- [ ] Files uploaded to `move-out-photos` bucket
- [ ] Filenames are unique (timestamp + random string)
- [ ] Files are WebP format
- [ ] Files are publicly accessible
- [ ] File sizes are <1MB

### Database
- [ ] `move_out_intentions` table has records
- [ ] `key_area_photos` column contains array of URLs
- [ ] `damage_photos` column contains array of URLs
- [ ] URLs are valid and accessible
- [ ] No base64 data in database

### Server Action
- [ ] Server Action receives small payload (<1MB)
- [ ] No "Body exceeded 1MB" errors
- [ ] Form submission is fast
- [ ] Database updates correctly

## Performance Metrics

Measure and record:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Photo file size (avg) | 3-5MB | 400-800KB | 80-90% |
| Upload time (5 photos) | N/A | <10s | N/A |
| Server Action body | ~30MB | <1KB | 99.9% |
| Form submission time | Failed | <1s | ✅ |
| Body limit errors | Yes | No | ✅ |

## Common Issues and Solutions

### Issue: Photos not compressing
**Solution:** Check console for errors, verify browser-image-compression library loaded

### Issue: Upload fails
**Solution:** Check Supabase credentials, verify storage bucket exists and is public

### Issue: Orientation wrong
**Solution:** Verify EXIF preservation in compression options

### Issue: "Body exceeded 1MB" still occurs
**Solution:** Verify photos are uploaded to Storage BEFORE form submission, not during

## Database Query for Verification

After successful submission, run this query in Supabase SQL editor:

```sql
SELECT 
  id,
  tenancy_id,
  planned_move_out_date,
  key_area_photos,
  damage_photos,
  array_length(key_area_photos, 1) as key_area_count,
  array_length(damage_photos, 1) as damage_count,
  created_at
FROM move_out_intentions
ORDER BY created_at DESC
LIMIT 5;
```

**Verify:**
- URLs in `key_area_photos` array
- URLs in `damage_photos` array
- URLs are accessible (not base64)

## Success Criteria

All tests pass when:
- ✅ All photos compress to <1MB
- ✅ All photos upload successfully
- ✅ Form submission completes without errors
- ✅ No "Body exceeded 1MB" errors
- ✅ Database contains photo URLs
- ✅ Photos are accessible via URLs
- ✅ UI provides clear feedback
- ✅ Error messages are helpful

## Reporting Results

When reporting test results, include:
1. Test case number and name
2. Browser and version
3. Device type (desktop/mobile)
4. Pass/Fail status
5. Screenshots of any issues
6. Console logs for failures
7. Network tab screenshots showing file sizes

---

**Last Updated:** Implementation complete
**Feature Status:** Ready for testing
