import crypto from 'crypto'

const ENCRYPTION_KEY = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY || '', 'hex')
const ALGORITHM = 'aes-256-gcm'

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decrypt(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':')
  
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}




// import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
// import crypto from 'crypto'

// const ENCRYPTION_KEY = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY!, 'hex')
// const ALGORITHM = 'aes-256-gcm'

// export function encryptToken(token: string): string {
//   const iv = randomBytes(16)
//   const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  
//   let encrypted = cipher.update(token, 'utf8', 'hex')
//   encrypted += cipher.final('hex')
//   const authTag = cipher.getAuthTag().toString('hex')
  
//   return `${iv.toString('hex')}:${authTag}:${encrypted}`
// }

// export function decryptToken(encryptedToken: string): string {
//   const [ivHex, authTagHex, encrypted] = encryptedToken.split(':')
//   const iv = Buffer.from(ivHex, 'hex')
//   const authTag = Buffer.from(authTagHex, 'hex')
  
//   const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
//   decipher.setAuthTag(authTag)
  
//   let decrypted = decipher.update(encrypted, 'hex', 'utf8')
//   decrypted += decipher.final('utf8')
//   return decrypted
// }

