import { useStore } from '../../state/store'
import { authApi } from '../../services/api'

export default function Wallet() {
  const { wallet, connected, connectWallet, disconnectWallet, setToken } = useStore()

  const handleConnect = async () => {
    await connectWallet()
    
    // Authenticate with backend
    const walletAddress = useStore.getState().wallet
    if (walletAddress) {
      try {
        // Get nonce
        const nonceRes = await authApi.getNonce(walletAddress)
        const { message } = nonceRes.data

        // Sign message
        const signer = useStore.getState().signer
        if (signer) {
          const signature = await signer.signMessage(message)

          // Login
          const loginRes = await authApi.login(walletAddress, signature, message)
          setToken(loginRes.data.token)
        }
      } catch (error) {
        console.error('Authentication failed:', error)
      }
    }
  }

  if (connected && wallet) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-400">
          {wallet.slice(0, 6)}...{wallet.slice(-4)}
        </span>
        <button
          onClick={disconnectWallet}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleConnect}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
    >
      Connect Wallet
    </button>
  )
}
