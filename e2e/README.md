# E2E Tests with Playwright

End-to-end tests for critical user flows on Gardee v2 frontend.

## Running Tests

### Unit Tests (Vitest)
```bash
npm test              # Run unit tests once
npm run test:coverage # Run with coverage report
```

### E2E Tests (Playwright)
```bash
npm run test:e2e      # Run all E2E tests (headless)
npm run test:e2e:ui   # Run with UI mode (interactive)
npm run test:e2e:debug # Run with debug mode (slow, verbose)
```

## Test Suites

### `search.spec.ts`
- Homepage navigation
- Map/Ranking navigation
- Service filtering
- Location-based search
- Gardener profile views
- **Breadcrumb navigation** (new feature)

### `auth.spec.ts`
- Login page navigation
- Form field validation
- Email validation
- Forgot password flow
- Registration page navigation

### `registration.spec.ts`
- Prestataire registration flow
- Multi-step form navigation
- Field validation (email, password length, SIRET)
- **Form persistence** (auto-save to localStorage)
- Form restoration from draft

### `contact.spec.ts`
- Contact page navigation
- Contact form fields
- Footer visibility

## Configuration

Tests run against `localhost:4321` (dev server starts automatically).

### Browsers Tested
- Chromium (desktop)
- Firefox (desktop)
- WebKit (desktop)
- Mobile Chrome (Pixel 5)

### Test Results
- Screenshots of failures in `test-results/`
- Video recordings of failures in `test-results/`
- HTML report in `playwright-report/`

## CI/CD Integration

In CI environment:
- Tests run with retries (2x)
- Single worker (no parallelization)
- Video/screenshot on failures only
- Artifacts uploaded to workflow results

## Best Practices

1. **Keep tests focused** — One behavior per test
2. **Use meaningful names** — Describe what's being tested
3. **Wait for network** — Use `waitForLoadState('networkidle')`
4. **Handle optional features** — Use `.isVisible().catch(() => false)`
5. **Test critical flows** — Focus on main user journeys
6. **Avoid test interdependencies** — Each test is independent

## Future Improvements

- [ ] Add authenticated user tests (login/dashboard)
- [ ] Add booking widget tests
- [ ] Add rating/review tests
- [ ] Add admin panel tests
- [ ] Visual regression testing
- [ ] Performance benchmarks
- [ ] Mobile-specific scenarios
