# Hardware Wallet Support Guide

This document provides complete instructions, operational context, technical limitations, and troubleshooting guidance for using hardware wallets (such as **Ledger Nano S**, **Ledger Nano S Plus**, **Ledger Nano X**, and **Ledger Flex**) with **Stellar Nebula** via browser extension wallets (primarily **Freighter**).

---

## 1. Overview

Stellar Nebula supports hardware wallet authentication and transaction signing through the **Freighter** wallet extension. Freighter seamlessly interfaces with physical Ledger hardware devices using WebUSB / WebHID protocols, allowing users to keep their private keys offline on hardware while interacting with procedural nebulae, harvesting resources, and executing Soroban smart contract interactions on Stellar.

---

## 2. Step-by-Step Hardware Wallet Setup

### Prerequisites

1. **Ledger Device**: Ledger Nano S, S Plus, X, or Flex updated to the latest firmware.
2. **Stellar App on Ledger**: Installed via Ledger Live (v3.5.0 or later recommended).
3. **Freighter Wallet Extension**: Installed in Google Chrome, Brave, Firefox, or MS Edge.
4. **USB Connection**: Original USB-C / Micro-USB cable connecting Ledger directly to your computer.

### Connecting Ledger to Freighter

1. **Unlock Device**: Connect your Ledger device and enter your PIN code.
2. **Open Stellar App**: Navigate to the **Stellar** app on your Ledger screen and press both buttons to open it.
3. **Enable Blind Signing**:
   - In the Stellar app menu on Ledger, navigate to **Settings**.
   - Select **Blind Signing** (or **Hash Signing**) and set it to **Enabled**. _(Required for Soroban contract invocations)._
4. **Pair with Freighter**:
   - Open the **Freighter** browser extension.
   - Click the account selector / avatar and choose **Add Account** > **Connect Hardware Wallet** (or **Connect Ledger**).
   - Follow the prompt to pair your USB device.
5. **Connect to Stellar Nebula**:
   - Launch Stellar Nebula.
   - Click **Connect Wallet** in the top navigation bar.
   - Select **Freighter**.
   - Approve the connection request in Freighter. Your public key starting with `G...` will display in the header.

---

## 3. Technical & Operational Limitations

| Feature / Aspect                    | Capability & Limitation Details                                                                                                                                                |
| :---------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Contract Call Signing (Soroban)** | Requires **Blind Signing** enabled in the Ledger Stellar app menu. Standard transaction details may show raw hashes on the device screen.                                      |
| **Browser Security Context**        | WebUSB / WebHID physical device access is restricted by modern browsers to **HTTPS** origins or `localhost`. HTTP deployments will block USB device pairing.                   |
| **Transaction Signing Timeout**     | Ledger hardware requires manual physical button approvals on the device for every transaction. Users have up to 60 seconds to review and confirm before the request times out. |
| **Mobile Web Browsers**             | Direct USB connection to Ledger is generally not supported on mobile web browsers. Mobile users should use Bluetooth-paired desktop setups or software wallets.                |
| **Multi-Account Switching**         | Ensure the active account index selected in Freighter matches the account index selected on the physical Ledger device.                                                        |

---

## 4. Troubleshooting Guide

### Common Error: `Device locked or Stellar app closed`

- **Cause**: Ledger screen went to sleep or the Stellar app is not active.
- **Resolution**: Unlock your Ledger, re-open the **Stellar** app, and attempt the connection or transaction again.

### Common Error: `Tx failed: Blind signing not enabled`

- **Cause**: Soroban transaction contains smart contract parameters that the Ledger app cannot display in plain text.
- **Resolution**: Open **Stellar app** on Ledger > **Settings** > **Blind Signing** > Set to **Enabled**.

### Common Error: `WebUSB / WebHID device not found`

- **Cause**: Browser permissions blocked, cable faulty, or another app (like Ledger Live) is open and claiming exclusive USB access.
- **Resolution**:
  1. Close **Ledger Live** completely.
  2. Disconnect and re-plug the USB cable.
  3. Ensure browser site permissions allow USB device access (`chrome://settings/content/siteDetails`).

### Common Error: `Freighter transaction signing timeout`

- **Cause**: Delayed physical button press on the Ledger device during transaction verification.
- **Resolution**: Keep your device within reach. When initiating ship upgrades or nebula scans, review and approve the details on your Ledger screen promptly.

---

## 5. Direct Ledger Integration (#447)

In addition to Freighter wallet integration, Stellar Nebula now includes native Ledger WebUSB support for direct device communication.

### Direct Connection Features

- **WebUSB Support**: Direct connection to Ledger devices without wallet intermediary
- **Public Key Derivation**: BIP44 standard path `44'/148'/0'`
- **Transaction Signing**: Full transaction signing with device confirmation
- **Error Handling**: User-friendly error messages for common issues
- **Multi-Network**: Supports Testnet, Futurenet, and Mainnet

### Using Direct Ledger Connection

#### React Hook

```typescript
import { useLedger } from '@/hooks/useLedger'

function Component() {
  const ledger = useLedger({ network: 'mainnet' })

  const handleConnect = async () => {
    const publicKey = await ledger.connect()
    console.log('Connected:', publicKey)
  }

  return <button onClick={handleConnect}>Connect Ledger</button>
}
```

#### Pre-built Component

```typescript
import { LedgerConnect } from '@/components/LedgerConnect'

function WalletSetup() {
  return (
    <LedgerConnect
      network="mainnet"
      onConnect={(publicKey) => console.log('Ready to sign')}
      onError={(error) => console.error(error)}
    />
  )
}
```

### Supported Devices

- Ledger Nano S (firmware 1.6.0+)
- Ledger Nano S Plus
- Ledger Nano X
- Ledger Flex

### Browser Requirements

| Browser | Support | Note |
|---------|---------|------|
| Chrome  | ✅ Yes  | Desktop only |
| Edge    | ✅ Yes  | Desktop only |
| Firefox | ❌ No   | WebUSB unavailable |
| Safari  | ❌ No   | WebUSB unavailable |

### Utilities

```typescript
// Check Ledger support
import { checkLedgerSupport } from '@/utils/ledger-utils'
const supported = await checkLedgerSupport()

// Get device info
import { getLedgerDeviceInfo } from '@/utils/ledger-utils'
const info = await getLedgerDeviceInfo()

// User-friendly error formatting
import { formatLedgerError } from '@/utils/ledger-utils'
const message = formatLedgerError(error)
```

---

## 6. Security Best Practices

- **Verify Recipient & Hash**: Always cross-check the transaction hash displayed on your Ledger screen against the transaction hash rendered by Stellar Nebula before pressing both buttons to confirm.
- **Keep Firmware Updated**: Regularly update your Ledger device firmware and Stellar application via Ledger Live to ensure full compatibility with modern Soroban specifications.
- **Session Auto-Disconnect**: Stellar Nebula automatically enforces a session timeout after inactivity to ensure your connected hardware session remains secure when unattended.
- **Device Confirmation Required**: All transactions require explicit approval on the physical device. Never sign without reviewing the transaction details.
