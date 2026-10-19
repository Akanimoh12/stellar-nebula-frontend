import { useCallback, useState } from 'react'
import type { StellarNetwork } from '@/config/stellar'
import { getAllNetworks } from '@/config/networks'
import styles from './NetworkSelector.module.css'

export interface NetworkSelectorProps {
  currentNetwork: StellarNetwork
  onNetworkChange: (network: StellarNetwork) => void
  isLoading?: boolean
  disabled?: boolean
}

export function NetworkSelector({
  currentNetwork,
  onNetworkChange,
  isLoading = false,
  disabled = false,
}: NetworkSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const networks = getAllNetworks()

  const handleNetworkSelect = useCallback(
    (network: StellarNetwork) => {
      if (network === currentNetwork) {
        setIsOpen(false)
        return
      }
      onNetworkChange(network)
      setIsOpen(false)
    },
    [currentNetwork, onNetworkChange]
  )

  const currentNetworkConfig = networks.find((n) => n.name === currentNetwork)

  return (
    <div className={styles.container}>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        aria-label="Select Stellar Network"
        aria-expanded={isOpen}
      >
        <span className={styles.icon}>🌐</span>
        <span className={styles.label}>{currentNetworkConfig?.label}</span>
        {isLoading && <span className={styles.spinner} />}
        <span className={styles.chevron}>▼</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <h3>Select Network</h3>
          </div>
          <div className={styles.networkList}>
            {networks.map((network) => (
              <button
                key={network.name}
                className={`${styles.networkOption} ${
                  currentNetwork === network.name ? styles.active : ''
                }`}
                onClick={() => handleNetworkSelect(network.name as StellarNetwork)}
                disabled={isLoading}
                type="button"
              >
                <div className={styles.networkInfo}>
                  <div className={styles.networkName}>{network.label}</div>
                  <div className={styles.networkDescription}>{network.description}</div>
                </div>
                {currentNetwork === network.name && <span className={styles.checkmark}>✓</span>}
                {network.isMainnet && <span className={styles.mainnetBadge}>MAINNET</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && <div className={styles.overlay} onClick={() => setIsOpen(false)} />}
    </div>
  )
}
