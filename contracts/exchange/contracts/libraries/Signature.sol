// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Signature
 * @notice ECDSA signature verification utilities
 * @dev Supports EIP-191 and EIP-712 style signatures
 */
library Signature {
    /**
     * @notice Recover signer from signature
     * @param hash Message hash
     * @param signature Signature bytes
     * @return Signer address
     */
    function recover(bytes32 hash, bytes memory signature) internal pure returns (address) {
        require(signature.length == 65, "Signature: invalid length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        // EIP-2: Handle malleable signatures
        if (v < 27) {
            v += 27;
        }

        require(v == 27 || v == 28, "Signature: invalid v value");

        return ecrecover(hash, v, r, s);
    }

    /**
     * @notice Verify signature
     * @param hash Message hash
     * @param signature Signature bytes
     * @param signer Expected signer address
     * @return True if valid
     */
    function verify(
        bytes32 hash,
        bytes memory signature,
        address signer
    ) internal pure returns (bool) {
        return recover(hash, signature) == signer;
    }

    /**
     * @notice Get EIP-191 prefixed hash
     * @param hash Original hash
     * @return Prefixed hash
     */
    function toEthSignedMessageHash(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }
}

