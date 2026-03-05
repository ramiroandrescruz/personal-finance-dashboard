import React from 'react'
import ReactDOM from 'react-dom/client'
import { MantineProvider, createTheme } from '@mantine/core'
import '@mantine/core/styles.css'
import App from './App'
import './styles.css'

const theme = createTheme({
  fontFamily: 'Manrope, Segoe UI, sans-serif',
  headings: {
    fontFamily: 'Space Grotesk, Manrope, sans-serif'
  },
  primaryColor: 'cyan'
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <App />
    </MantineProvider>
  </React.StrictMode>
)
