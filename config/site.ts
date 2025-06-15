export type SiteConfig = typeof siteConfig

export const siteConfig = {
  name: "Encryptor.link",
  description:
    "Zero-knowledge encryption for messages and files. Secure, client-side encryption with no server storage.",
  mainNav: [
    {
      title: "Home",
      href: "/",
    },
    {
      title: "Encrypt",
      href: "/encrypt",
    },
    {
      title: "Decrypt",
      href: "/view",
    },
  ],
  links: {
    twitter: "https://twitter.com/encryptorlink",
    github: "https://github.com/yourusername/encryptor-link",
    docs: "https://encryptor.link/docs",
  },
}