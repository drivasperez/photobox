# Todo

- [ ] Move downloaded images out of src folder, feels weird to modify that in build.
- [x] Move exif stuff out of nunjuks filters into `_data/images.js`
- [ ] Reuse photo template between main page and details page
- [ ] Move resizing out of rollup, into `_data/images.js`?
- [ ] Check ETAG of each image to decide whether to use cached version
- [ ] Remove from cache if not in AWS list
- [ ] Paginate main page
- [x] Add credentials to Vercel
- [ ] Add lambda to trigger build when adding to / deleting from / editing S3 bucket
- [ ] Add lambda to resize on adding to S3, rather than here?
- [ ] Add interface/cli for adding to S3 bucket, rather than manually in AWS console.
- [ ] Move AWS region/bucket to environment variables
- [ ] Fix CSS zoom issues
- [x] Check bundle sizes
- [ ] RSS Feed
