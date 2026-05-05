import { Platform } from "react-native";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, signOut } from "firebase/auth";
import { auth } from "./firebase";

let _confirmationResult: ConfirmationResult | null = null;
let _recaptchaVerifier: RecaptchaVerifier | null = null;
let _pendingUser: { name: string; email: string; password: string; phone: string } | null = null;

export function setPendingUser(data: { name: string; email: string; password: string; phone: string }) {
  _pendingUser = { ...data };
}

export function getPendingUser() {
  return _pendingUser;
}

export function clearPendingUser() {
  _pendingUser = null;
  _confirmationResult = null;
}

export async function sendPhoneOTP(phone: string): Promise<void> {
  if (Platform.OS !== "web") {
    throw new Error("Phone OTP is supported on web in this version.");
  }

  const fullPhone = `+91${phone}`;

  try {
    // Ensure reCAPTCHA container exists in DOM
    if (typeof document !== "undefined") {
      let container = document.getElementById("recaptcha-container");
      if (!container) {
        container = document.createElement("div");
        container.id = "recaptcha-container";
        container.style.position = "absolute";
        container.style.opacity = "0";
        container.style.pointerEvents = "none";
        document.body.appendChild(container);
      }
    }

    // Reset verifier if it already exists
    if (_recaptchaVerifier) {
      try { _recaptchaVerifier.clear(); } catch {}
      _recaptchaVerifier = null;
    }

    _recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
      callback: () => {},
      "expired-callback": () => { _recaptchaVerifier = null; },
    });

    _confirmationResult = await signInWithPhoneNumber(auth, fullPhone, _recaptchaVerifier);
  } catch (e: any) {
    _recaptchaVerifier = null;
    const code: string = e?.code ?? "";
    if (code.includes("invalid-phone-number")) throw new Error("Invalid phone number. Use a valid 10-digit number.");
    if (code.includes("too-many-requests")) throw new Error("Too many attempts. Please wait and try again.");
    if (code.includes("operation-not-allowed")) throw new Error("Phone authentication is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.");
    if (code.includes("billing-not-enabled")) throw new Error("Firebase billing is required for Phone Auth. Please upgrade your Firebase plan.");
    if (e?.message) throw new Error(e.message);
    throw new Error("Failed to send OTP. Please try again.");
  }
}

export async function verifyOTP(otp: string): Promise<void> {
  if (!_confirmationResult) throw new Error("OTP not sent yet. Please go back and send OTP first.");
  try {
    await _confirmationResult.confirm(otp);
    // Sign out from phone auth — we'll create email/password account separately
    await signOut(auth);
  } catch (e: any) {
    const code: string = e?.code ?? "";
    if (code.includes("invalid-verification-code")) throw new Error("Incorrect OTP. Please check and try again.");
    if (code.includes("code-expired")) throw new Error("OTP has expired. Please go back and request a new one.");
    if (e?.message) throw new Error(e.message);
    throw new Error("OTP verification failed. Please try again.");
  }
}
