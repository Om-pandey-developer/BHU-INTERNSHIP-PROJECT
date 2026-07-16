import React, { useState, useEffect } from "react";
import api from "@/lib/axios";

interface SvgCaptchaProps {
  onVerify: (token: string, value: string) => void;
  className?: string;
}

export default function SvgCaptcha({ onVerify, className = "" }: SvgCaptchaProps) {
  const [captchaSvg, setCaptchaSvg] = useState<string>("");
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const [captchaValue, setCaptchaValue] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCaptcha = async () => {
    try {
      setLoading(true);
      const response = await api.get("/auth/captcha");
      setCaptchaSvg(response.data.svg);
      setCaptchaToken(response.data.captchaToken);
      setCaptchaValue("");
      onVerify(response.data.captchaToken, "");
    } catch (error) {
      console.error("Failed to load captcha", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaptcha();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCaptchaValue(val);
    onVerify(captchaToken, val);
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="flex items-center gap-3 w-full">
        <div 
          className="flex-1 bg-white border border-outline-variant rounded-md flex justify-center items-center overflow-hidden h-[50px]"
          dangerouslySetInnerHTML={{ __html: captchaSvg || "Loading..." }}
        />
        <button
          type="button"
          onClick={fetchCaptcha}
          className="p-2 rounded-md hover:bg-surface-variant transition-colors"
          title="Refresh Captcha"
          disabled={loading}
        >
          <span className="material-symbols-rounded text-outline">refresh</span>
        </button>
      </div>
      <input
        type="text"
        placeholder="Enter CAPTCHA here"
        value={captchaValue}
        onChange={handleChange}
        className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface text-on-surface focus:outline-none focus:border-primary transition-colors uppercase"
        required
      />
    </div>
  );
}
