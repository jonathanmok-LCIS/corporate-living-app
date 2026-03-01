# Deployment Guide - Corporate Living App

This guide covers deploying the Corporate Living app to production.

## Pre-Deployment Checklist

- [ ] All migrations tested in development
- [ ] Environment variables documented
- [ ] Database backups configured
- [ ] Email service configured
- [ ] Error monitoring set up
- [ ] Performance testing completed
- [ ] Security review completed
- [ ] User acceptance testing passed

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel is the easiest deployment option for Next.js applications.

#### Steps:

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel auto-detects Next.js

3. **Configure Environment Variables**
   - In Vercel dashboard, go to Settings → Environment Variables
   - Add all variables from `.env.local`:
     ```
     NEXT_PUBLIC_SUPABASE_URL
     NEXT_PUBLIC_SUPABASE_ANON_KEY
     SUPABASE_SERVICE_ROLE_KEY
     ```
   - Add email service variables if configured

4. **Deploy**
   - Click "Deploy"
   - Vercel builds and deploys automatically
   - Your app is live at `https://your-app.vercel.app`

5. **Custom Domain (Optional)**
   - Go to Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

#### Continuous Deployment

Vercel automatically deploys:
- Production: Pushes to `main` branch
- Preview: Pull requests and other branches

### Option 2: Docker

For self-hosting or cloud providers that support Docker.

#### Create Dockerfile

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variables
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN npm run build

# Production image, copy all files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### Build and Run

```bash
# Build
docker build -t corporate-living-app .

# Run
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your-url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key \
  -e SUPABASE_SERVICE_ROLE_KEY=your-service-key \
  corporate-living-app
```

### Option 3: AWS / Google Cloud / Azure

#### AWS Elastic Beanstalk

1. Install EB CLI: `pip install awsebcli`
2. Initialize: `eb init`
3. Create environment: `eb create production`
4. Set environment variables: `eb setenv KEY=value`
5. Deploy: `eb deploy`

#### Google Cloud Run

1. Install gcloud CLI
2. Build: `gcloud builds submit --tag gcr.io/PROJECT_ID/corporate-living`
3. Deploy: `gcloud run deploy --image gcr.io/PROJECT_ID/corporate-living`

## Post-Deployment Configuration

### 1. Database Setup

Ensure all migrations are applied to production database:

```bash
# Using Supabase CLI
supabase link --project-ref production-ref
supabase db push
```

### 2. Supabase Configuration

In Supabase dashboard for production:

1. **Authentication**
   - Configure allowed URLs (add production domain)
   - Set up email templates
   - Enable providers (Email, Google, etc.)

2. **Storage**
   - Create buckets: `inspection-photos`, `signatures`
   - Configure access policies
   - Set file size limits

3. **Database**
   - Enable Point-in-Time Recovery (PITR)
   - Set up automatic backups
   - Configure connection pooling if needed

### 3. Email Service

Configure your email provider:

**Resend:**
```env
RESEND_API_KEY=your-production-key
EMAIL_FROM=noreply@yourdomain.com
```

Update `/app/api/notifications/route.ts` with production keys.

### 4. Monitoring

Set up monitoring services:

**Vercel Analytics:**
- Automatically enabled on Vercel
- View in dashboard

**Sentry (Error Tracking):**
```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

**Uptime Monitoring:**
- [UptimeRobot](https://uptimerobot.com)
- [Pingdom](https://pingdom.com)

## Security Hardening

### 1. Environment Variables

✅ Never commit `.env.local` to Git
✅ Use different Supabase projects for dev/prod
✅ Rotate service role keys periodically
✅ Use secrets management (Vercel, AWS Secrets Manager)

### 2. Supabase RLS

Verify Row Level Security is enabled on all tables:

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

All should show `rowsecurity = true`.

### 3. CORS Configuration

In Supabase dashboard:
- Settings → API
- Configure allowed origins for production domain only

### 4. Rate Limiting

Add rate limiting to API routes:

```bash
npm install @upstash/ratelimit @upstash/redis
```

### 5. HTTPS

✅ Vercel: Automatic HTTPS
✅ Custom domain: Ensure SSL certificate
✅ Redirect HTTP to HTTPS

## Performance Optimization

### 1. Next.js Configuration

Update `next.config.ts`:

```typescript
const config = {
  output: 'standalone',
  compress: true,
  images: {
    domains: ['your-supabase-project.supabase.co'],
  },
  // ... other config
};
```

### 2. Caching

- Enable Vercel Edge caching
- Use `revalidate` for ISR pages
- Cache static assets aggressively

### 3. Image Optimization

- Use Next.js `<Image>` component
- Configure Supabase image transformations
- Lazy load images

### 4. Database Indexing

Ensure indexes exist on frequently queried columns (already in migrations):
- `tenancies.status`
- `inspections.status`
- Foreign keys

## Backup Strategy

### Database Backups

**Supabase Pro:**
- Automatic daily backups
- 7-day retention

**Manual Backups:**
```bash
# Export database
supabase db dump -f backup.sql

# Restore
supabase db reset
psql -f backup.sql
```

### File Storage Backups

Use Supabase Storage API to backup files:
```bash
# Create backup script
npm run backup-storage
```

## Rollback Procedure

If deployment fails:

### Vercel
1. Go to Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"

### Docker
```bash
# Revert to previous image
docker pull corporate-living-app:previous-tag
docker stop current-container
docker run previous-image
```

### Database
```bash
# Restore from backup
supabase db reset
psql -f backup-YYYY-MM-DD.sql
```

## Scaling Considerations

### When to Scale

Monitor these metrics:
- Response time > 1s
- CPU usage > 70%
- Memory usage > 80%
- Database connections > 80%

### Scaling Options

1. **Vertical Scaling** (Supabase)
   - Upgrade to Pro plan
   - Increase compute resources

2. **Horizontal Scaling** (Next.js)
   - Vercel auto-scales
   - Add more instances for self-hosted

3. **Database Optimization**
   - Add read replicas
   - Enable connection pooling
   - Optimize slow queries

## Cost Optimization

### Free Tier Limits

**Supabase Free:**
- 500MB database
- 1GB file storage
- 50,000 monthly active users

**Vercel Free:**
- 100GB bandwidth
- Unlimited deployments

### Monitoring Costs

- Set up billing alerts
- Monitor Supabase dashboard
- Review Vercel usage

## Support and Maintenance

### Regular Tasks

**Daily:**
- Check error logs
- Monitor uptime

**Weekly:**
- Review performance metrics
- Check database size
- Test backups

**Monthly:**
- Security updates
- Dependency updates
- Database cleanup

### Update Procedure

```bash
# Update dependencies
npm update
npm audit fix

# Test locally
npm run build
npm run dev

# Deploy
git push origin main
```

## Troubleshooting

### Common Issues

**Build Failures:**
- Check environment variables
- Verify Node.js version
- Review build logs

**Database Connection:**
- Check Supabase status
- Verify credentials
- Check connection limits

**Performance Issues:**
- Enable caching
- Optimize database queries
- Review Next.js profiler

### Getting Help

- Supabase Discord: [discord.supabase.com](https://discord.supabase.com)
- Vercel Support: support@vercel.com
- GitHub Issues: Project repository

## Compliance

If handling sensitive data:

- [ ] GDPR compliance (data privacy)
- [ ] Data encryption at rest and in transit
- [ ] User data export capability
- [ ] Right to be forgotten implementation
- [ ] Privacy policy and terms of service
- [ ] Security audit completed

## Additional Resources

- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)
- [Vercel Deployment Guide](https://vercel.com/docs/deployments/overview)
