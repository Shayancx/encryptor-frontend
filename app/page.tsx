import Link from "next/link"
import { Shield, Lock, Zap, Github } from "lucide-react"

import { siteConfig } from "@/config/site"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function IndexPage() {
  return (
    <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
      <div className="flex max-w-[980px] flex-col items-start gap-2">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tighter md:text-5xl lg:text-6xl">
          Zero-Knowledge Encryption <br className="hidden sm:inline" />
          for Messages and Files
        </h1>
        <p className="max-w-[700px] text-lg text-muted-foreground md:text-xl">
          Encrypt your sensitive data directly in your browser. Your passwords and data never touch our servers. 
          100% client-side encryption using the Web Crypto API.
        </p>
      </div>
      
      <div className="flex gap-4">
        <Link
          href="/encrypt"
          className={buttonVariants({ size: "lg" })}
        >
          Start Encrypting
        </Link>
        <Link
          href={siteConfig.links.github}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          <Github className="mr-2 size-4" />
          GitHub
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <Shield className="mb-2 size-8 text-primary" />
            <CardTitle>Zero-Knowledge</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              All encryption happens in your browser. We never see your passwords or unencrypted data.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Lock className="mb-2 size-8 text-primary" />
            <CardTitle>Strong Encryption</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Uses AES-GCM-256 encryption with PBKDF2 key derivation (250,000 iterations) for maximum security.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Zap className="mb-2 size-8 text-primary" />
            <CardTitle>Instant Sharing</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Generate shareable links instantly. Recipients only need the password to decrypt.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 rounded-lg border bg-muted p-6">
        <h2 className="mb-4 text-xl font-semibold">How It Works</h2>
        <ol className="list-decimal space-y-2 pl-6 text-muted-foreground">
          <li>Enter your message or select a file to encrypt</li>
          <li>Choose a strong password (share this separately)</li>
          <li>Click encrypt to generate a secure link</li>
          <li>Share the link with your recipient</li>
          <li>They enter the password to decrypt</li>
        </ol>
      </div>
    </section>
  )
}