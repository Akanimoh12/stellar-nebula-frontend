import type { useShipUpgrade } from '../../hooks/contracts/useShipUpgrade'
import type { useWallet } from '../../contexts/WalletContext'
import { STELLAR_STROOPS_PER_XLM } from '../../constants/stellar'
import { ConfirmModal, TransactionPreview } from '../Transaction'
import type { ShipUpgradeOption } from '../Ship/UpgradeModal'

type UpgradeContract = ReturnType<typeof useShipUpgrade>

interface ContractUpgradeConfirmModalProps {
  upgrade: ShipUpgradeOption | null
  upgradeContract: UpgradeContract
  walletPublicKey: ReturnType<typeof useWallet>['walletState']['publicKey']
  isPreparing: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Pre-sign review of a simulated on-chain upgrade: fee, resource cost, and expected outcome. */
export function ContractUpgradeConfirmModal({
  upgrade,
  upgradeContract,
  walletPublicKey,
  isPreparing,
  onConfirm,
  onCancel,
}: ContractUpgradeConfirmModalProps) {
  return (
    <ConfirmModal
      isOpen={Boolean(upgrade)}
      title={`Confirm ${upgrade?.name ?? 'upgrade'}`}
      operationType="upgradeShip"
      estimatedFee={
        upgradeContract.simulation
          ? `${(Number(upgradeContract.simulation.minResourceFee) / STELLAR_STROOPS_PER_XLM).toFixed(7)} XLM`
          : 'Estimating…'
      }
      details={[
        {
          label: 'Resources consumed',
          value: upgrade
            ? Object.entries(upgrade.cost)
                .map(([name, amount]) => `${name}: ${amount}`)
                .join(', ')
            : '',
        },
        {
          label: 'Wallet',
          value: walletPublicKey
            ? `${walletPublicKey.slice(0, 6)}…${walletPublicKey.slice(-6)}`
            : 'Disconnected',
        },
      ]}
      isSubmitting={isPreparing}
      confirmLabel="Review and sign"
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      {upgrade && (
        <TransactionPreview
          operationName="upgrade_ship"
          feeStroops={upgradeContract.simulation?.minResourceFee ?? null}
          simulation={upgradeContract.simulation}
          simulationError={upgradeContract.error}
          costs={Object.entries(upgrade.cost).map(([name, amount]) => ({
            label: name,
            amount: String(amount),
          }))}
          outcomes={
            upgradeContract.simulation?.value &&
            typeof upgradeContract.simulation.value === 'object'
              ? Object.entries(upgradeContract.simulation.value as Record<string, unknown>).map(
                  ([key, value]) => ({
                    label: key,
                    value: typeof value === 'string' ? value : JSON.stringify(value),
                  })
                )
              : []
          }
        />
      )}
    </ConfirmModal>
  )
}
