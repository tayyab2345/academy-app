import { Metadata } from "next"
import Link from "next/link"
import { School } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Register - AcademyFlow",
  description: "Create your academy account",
}

export default function RegisterPage() {
  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:px-0">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Create your academy
          </h1>
          <p className="text-sm text-muted-foreground">
            Get started with AcademyFlow in minutes
          </p>
        </div>

        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <School className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-xl text-center">
              Welcome to AcademyFlow
            </CardTitle>
            <CardDescription className="text-center">
              The all-in-one platform to manage your academy efficiently
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-green-600 text-xs">✓</span>
                </div>
                <div>
                  <p className="font-medium">Complete management suite</p>
                  <p className="text-sm text-muted-foreground">
                    Manage students, teachers, courses, and fees in one place
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-green-600 text-xs">✓</span>
                </div>
                <div>
                  <p className="font-medium">Parent engagement</p>
                  <p className="text-sm text-muted-foreground">
                    Keep parents informed with real-time updates and reports
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-green-600 text-xs">✓</span>
                </div>
                <div>
                  <p className="font-medium">Free to start</p>
                  <p className="text-sm text-muted-foreground">
                    No credit card required. Upgrade when you need more features
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Link href="/register/academy" className="w-full">
              <Button className="w-full" size="lg">
                Create Your Academy
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
