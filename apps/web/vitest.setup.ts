import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Without this, one test's DOM stays mounted for the next — invisible with a
// single test file, and exactly the failure mode multiple suites hit first
// (two forms in the document, `getByLabelText` finding both).
afterEach(cleanup)
