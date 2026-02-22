# Automated Testing Recommendations

This document outlines a comprehensive automated testing strategy for the Corporate Living app.

---

## 🎯 Testing Strategy Overview

### Current State
- ❌ No automated tests exist
- ❌ `npm test` not configured
- ❌ No CI/CD testing pipeline
- ⚠️ Manual testing only

### Recommended Approach
**Three-tier testing pyramid:**
1. **E2E Tests** (Playwright) - 20% of tests
2. **Integration Tests** (Vitest + React Testing Library) - 30% of tests
3. **Unit Tests** (Vitest) - 50% of tests

---

## 🛠️ Setup Instructions

### Step 1: Install Testing Dependencies

```bash
# E2E Testing with Playwright
npm install -D @playwright/test

# Unit/Integration Testing with Vitest
npm install -D vitest @vitejs/plugin-react jsdom
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event

# MSW for API mocking (optional but recommended)
npm install -D msw
```

### Step 2: Configure Playwright

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Step 3: Configure Vitest

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

Create `tests/setup.ts`:

```typescript
import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});
```

### Step 4: Update package.json

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

---

## 🧪 Critical Test Cases

### 1. E2E Tests (Playwright)

Create `tests/e2e/auth.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should login successfully', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/admin/);
  });

  test('should persist session on refresh', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Refresh page
    await page.reload();
    
    // Should still be logged in
    await expect(page).not.toHaveURL(/\/login/);
  });
});
```

Create `tests/e2e/admin-workflow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Admin Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin/);
  });

  test('should create a new house', async ({ page }) => {
    await page.goto('/admin/houses');
    await page.click('button:has-text("Create House")');
    
    await page.fill('input[name="name"]', 'Test House');
    await page.fill('input[name="address"]', '123 Test St');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Test House')).toBeVisible();
  });

  test('should create a new room', async ({ page }) => {
    await page.goto('/admin/houses');
    await page.click('text=House Alpha');
    await page.click('text=Rooms');
    await page.click('button:has-text("Add Room")');
    
    await page.fill('input[name="label"]', 'A4');
    await page.selectOption('select[name="capacity"]', '1');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=A4')).toBeVisible();
  });

  test('should create a tenancy', async ({ page }) => {
    await page.goto('/admin/tenancies');
    await page.click('button:has-text("Create Tenancy")');
    
    // Fill form
    await page.selectOption('select[name="tenant"]', { label: 'Tenant A' });
    await page.selectOption('select[name="room"]', { label: 'House Alpha - A1' });
    await page.fill('input[name="start_date"]', '2026-01-01');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Tenant A')).toBeVisible();
  });
});
```

Create `tests/e2e/tenant-workflow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Tenant Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as tenant
    await page.goto('/login');
    await page.fill('input[type="email"]', 'tenanta@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/tenant/);
  });

  test('should view tenancy details', async ({ page }) => {
    await page.goto('/tenant');
    
    await expect(page.locator('text=Your Tenancy')).toBeVisible();
    await expect(page.locator('text=House Alpha')).toBeVisible();
    await expect(page.locator('text=Room A1')).toBeVisible();
  });

  test('should submit move-out intention without photos', async ({ page }) => {
    await page.goto('/tenant/move-out');
    
    await page.fill('input[name="planned_move_out_date"]', '2026-03-01');
    await page.fill('textarea[name="notes"]', 'Moving to new city');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=successfully')).toBeVisible();
  });

  test('should submit move-out intention with photos', async ({ page }) => {
    await page.goto('/tenant/move-out');
    
    await page.fill('input[name="planned_move_out_date"]', '2026-03-01');
    
    // Upload photo
    await page.setInputFiles('input[type="file"]', {
      name: 'test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
    });
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=successfully')).toBeVisible();
  });

  test('should sign move-in acknowledgement', async ({ page }) => {
    // This test requires a tenant with MOVE_IN_PENDING_SIGNATURE status
    await page.goto('/tenant/move-in');
    
    // Draw signature (simulate canvas interaction)
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 50, y: 50 } });
    
    await page.click('button:has-text("Submit")');
    
    await expect(page.locator('text=successfully')).toBeVisible();
  });
});
```

Create `tests/e2e/coordinator-workflow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Coordinator Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as coordinator
    await page.goto('/login');
    await page.fill('input[type="email"]', 'coordinator1@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/coordinator/);
  });

  test('should only see assigned houses', async ({ page }) => {
    await page.goto('/coordinator');
    
    await expect(page.locator('text=House Alpha')).toBeVisible();
    await expect(page.locator('text=House Beta')).not.toBeVisible();
  });

  test('should review move-out intention', async ({ page }) => {
    await page.goto('/coordinator/move-out-reviews');
    
    await expect(page.locator('text=Tenant A')).toBeVisible();
    await page.click('text=View Details');
    
    await expect(page.locator('text=Planned Move-Out Date')).toBeVisible();
  });

  test('should create inspection', async ({ page }) => {
    await page.goto('/coordinator/inspections');
    await page.click('button:has-text("Create Inspection")');
    
    // Complete checklist
    await page.click('input[name="walls_clean"][value="yes"]');
    await page.click('input[name="floor_clean"][value="yes"]');
    // ... complete all checklist items
    
    await page.click('button:has-text("Save Draft")');
    
    await expect(page.locator('text=Draft saved')).toBeVisible();
  });
});
```

Create `tests/e2e/rls-security.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('RLS Security Tests', () => {
  test('tenant cannot access other tenants data', async ({ page }) => {
    // Login as Tenant A
    await page.goto('/login');
    await page.fill('input[type="email"]', 'tenanta@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Try to access Tenant B's data (requires knowing the tenancy ID)
    // This should fail or show no data
    await page.goto('/tenant');
    
    // Should only see own tenancy
    await expect(page.locator('text=Room A1')).toBeVisible();
    await expect(page.locator('text=Room A2')).not.toBeVisible();
  });

  test('coordinator cannot access non-assigned house', async ({ page }) => {
    // Login as Coordinator 1 (assigned to House Alpha only)
    await page.goto('/login');
    await page.fill('input[type="email"]', 'coordinator1@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.goto('/coordinator');
    
    // Should only see House Alpha
    await expect(page.locator('text=House Alpha')).toBeVisible();
    await expect(page.locator('text=House Beta')).not.toBeVisible();
  });

  test('tenant cannot access admin routes', async ({ page }) => {
    // Login as tenant
    await page.goto('/login');
    await page.fill('input[type="email"]', 'tenanta@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Try to access admin page
    await page.goto('/admin');
    
    // Should be redirected
    await expect(page).toHaveURL(/\/tenant/);
  });
});
```

---

### 2. Integration Tests

Create `tests/integration/server-actions.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { submitMoveOutIntention } from '@/app/tenant/move-out/actions';
import { getTenantActiveTenancy } from '@/app/tenant/move-out/actions';

describe('Server Actions - Move Out', () => {
  it('should submit move-out intention successfully', async () => {
    const result = await submitMoveOutIntention({
      tenancyId: 'test-tenancy-id',
      plannedMoveOutDate: '2026-03-01',
      notes: 'Test notes',
      keyAreaPhotoUrls: [],
      damagePhotoUrls: [],
      damageDescription: null,
    });

    expect(result.success).toBe(true);
  });

  it('should reject move-out for non-owned tenancy', async () => {
    const result = await submitMoveOutIntention({
      tenancyId: 'someone-elses-tenancy',
      plannedMoveOutDate: '2026-03-01',
      notes: 'Test notes',
      keyAreaPhotoUrls: [],
      damagePhotoUrls: [],
      damageDescription: null,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('do not own');
  });

  it('should get active tenancy', async () => {
    const result = await getTenantActiveTenancy();

    expect(result).toHaveProperty('data');
    if (result.data) {
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('status');
    }
  });
});
```

---

### 3. Component Unit Tests

Create `tests/unit/components/SignatureCanvas.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SignatureCanvas from '@/components/SignatureCanvas';

describe('SignatureCanvas Component', () => {
  it('renders canvas element', () => {
    render(<SignatureCanvas />);
    const canvas = screen.getByRole('img'); // Canvas has img role
    expect(canvas).toBeInTheDocument();
  });

  it('has clear button', () => {
    render(<SignatureCanvas />);
    const clearButton = screen.getByText(/clear/i);
    expect(clearButton).toBeInTheDocument();
  });
});
```

---

## 📊 CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## ✅ Test Coverage Goals

**Target Coverage:**
- Overall: 80%
- Critical paths: 95%
- Server actions: 90%
- Components: 75%

**Priority Areas (Must have 95%+ coverage):**
1. Authentication flows
2. Move-out submission
3. Move-in acknowledgement
4. RLS security policies
5. Coordinator assignment

**Can have lower coverage (<70%):**
1. UI components (purely visual)
2. Admin CRUD operations
3. Email notification logic

---

## 🔄 Testing Workflow

**Daily Development:**
1. Write test before feature
2. Implement feature
3. Run unit tests: `npm test`
4. Check coverage: `npm run test:coverage`

**Before PR:**
1. Run all unit tests: `npm test`
2. Run E2E tests: `npm run test:e2e`
3. Check lint: `npm run lint`
4. Check build: `npm run build`

**CI/CD:**
1. Automatic test run on push
2. Block merge if tests fail
3. Generate coverage report
4. Store test artifacts

---

## 📚 Resources

- **Playwright Docs:** https://playwright.dev/
- **Vitest Docs:** https://vitest.dev/
- **Testing Library:** https://testing-library.com/
- **MSW Docs:** https://mswjs.io/

---

## 🎯 Implementation Timeline

**Week 1:**
- [ ] Setup testing infrastructure
- [ ] Write authentication E2E tests
- [ ] Write first server action tests

**Week 2:**
- [ ] Write admin workflow E2E tests
- [ ] Write component unit tests
- [ ] Setup CI/CD pipeline

**Week 3:**
- [ ] Write tenant workflow E2E tests
- [ ] Write coordinator workflow E2E tests
- [ ] Write RLS security tests

**Week 4:**
- [ ] Achieve 80% coverage target
- [ ] Document testing patterns
- [ ] Train team on testing

---

This testing strategy will significantly improve code quality, reduce bugs, and enable confident deployments.
