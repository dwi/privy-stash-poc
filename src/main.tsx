import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, useAccount, useSignMessage, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi'
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { ronin, saigon } from '@reown/appkit/networks'
import { toPrivyWalletConnector } from '@privy-io/cross-app-connect/rainbow-kit'
import { parseEther } from 'viem'

const PRIVY_APP_ID = 'cmpkwmb7l001c0bjp3sdn6n8e' // Ronin Stash global wallet
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID
if (!projectId) console.error('[poc] VITE_REOWN_PROJECT_ID is missing, add it to .env')

const networks = [ronin, saigon] as [typeof ronin, typeof saigon]

const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
  connectors: [
    toPrivyWalletConnector({
      id: PRIVY_APP_ID,
      name: 'Ronin Stash',
      iconUrl: 'https://www.google.com/s2/favicons?domain=roninchain.com&sz=64',
    }),
  ],
})

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: 'Ronin Stash test',
    description: 'Privy global wallet test',
    url: window.location.origin,
    icons: [],
  },
  features: { analytics: false },
})

const queryClient = new QueryClient()

const log = (label: string, data?: unknown) => console.log(`[poc] ${label}`, data ?? '')
const fail = (label: string) => (err: unknown) => console.error(`[poc] ${label} failed`, err)

function App() {
  const { address, chain, status, connector } = useAccount()
  const sign = useSignMessage()
  const send = useSendTransaction()
  const receipt = useWaitForTransactionReceipt({ hash: send.data })

  log('account', { status, address, chainId: chain?.id, connector: connector?.id })
  if (receipt.data) log('tx receipt', receipt.data)
  if (receipt.error) fail('tx receipt')(receipt.error)

  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
      <appkit-button />
      {address && (
        <>
          <div>Chain: {chain?.name} ({chain?.id})</div>
          <button
            onClick={() =>
              sign.signMessageAsync({ message: `Ronin Stash test ${new Date().toISOString()}` })
                .then((sig) => log('signature', sig), fail('signMessage'))
            }
          >
            Sign message
          </button>
          <div>{sign.data ?? sign.error?.message}</div>
          <button
            onClick={() => {
              log('sending 0.0001 to self', address)
              send.sendTransactionAsync({ to: address, value: parseEther('0.0001') })
                .then((hash) => log('tx hash', hash), fail('sendTransaction'))
            }}
          >
            Send 0.0001 to self
          </button>
          <div>
            {send.data ?? send.error?.message}
            {receipt.data && ` (${receipt.data.status}, block ${receipt.data.blockNumber})`}
          </div>
        </>
      )}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <WagmiProvider config={wagmiAdapter.wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </WagmiProvider>,
)
