import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BigButton } from "@/components/kiosk/BigButton";
import { NumPad } from "@/components/kiosk/NumPad";
import { ThaiKeyboard } from "@/components/kiosk/ThaiKeyboard";

describe("Kiosk Components - BigButton", () => {
  it("renders with contrast-compliant primary-green styling (dark text)", () => {
    render(<BigButton variant="primary-green">มีบัญชีแล้ว</BigButton>);
    const button = screen.getByRole("button", { name: "มีบัญชีแล้ว" });
    expect(button).toBeInTheDocument();
    // Verify contrast: text must be #1F3A4D (not white) on #2FB39A
    expect(button.className).toContain("bg-[#2FB39A]");
    expect(button.className).toContain("text-[#1F3A4D]");
    expect(button.className).toContain("min-h-[96px]");
  });

  it("renders with primary-blue styling (bold white text)", () => {
    render(<BigButton variant="primary-blue">ยังไม่มีบัญชี</BigButton>);
    const button = screen.getByRole("button", { name: "ยังไม่มีบัญชี" });
    expect(button.className).toContain("bg-[#3F7FD0]");
    expect(button.className).toContain("text-white");
    expect(button.className).toContain("min-h-[96px]");
  });

  it("triggers onClick callback when clicked", () => {
    const handleClick = vi.fn();
    render(<BigButton onClick={handleClick}>แตะเพื่อเริ่ม</BigButton>);
    fireEvent.click(screen.getByRole("button", { name: "แตะเพื่อเริ่ม" }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe("Kiosk Components - NumPad", () => {
  it("emits digits when keys are tapped", () => {
    const onDigit = vi.fn();
    const onBackspace = vi.fn();
    const onClear = vi.fn();

    render(
      <NumPad
        onDigit={onDigit}
        onBackspace={onBackspace}
        onClear={onClear}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "5" }));
    expect(onDigit).toHaveBeenCalledWith("5");

    fireEvent.click(screen.getByRole("button", { name: "9" }));
    expect(onDigit).toHaveBeenCalledWith("9");

    fireEvent.click(screen.getByRole("button", { name: "ลบตัวเลขล่าสุด" }));
    expect(onBackspace).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "ล้างทั้งหมด" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

describe("Kiosk Components - ThaiKeyboard", () => {
  it("emits characters when keyboard buttons are clicked", () => {
    const onChar = vi.fn();
    const onBackspace = vi.fn();
    const onSpace = vi.fn();

    render(
      <ThaiKeyboard
        onChar={onChar}
        onBackspace={onBackspace}
        onSpace={onSpace}
      />
    );

    // Click Thai letter "ก"
    const keyKoKai = screen.getByRole("button", { name: "ก" });
    fireEvent.click(keyKoKai);
    expect(onChar).toHaveBeenCalledWith("ก");

    // Click spacebar
    const spacebar = screen.getByRole("button", { name: /เว้นวรรค/ });
    fireEvent.click(spacebar);
    expect(onSpace).toHaveBeenCalledTimes(1);

    // Click backspace
    const backspace = screen.getByRole("button", { name: "ลบตัวอักษร" });
    fireEvent.click(backspace);
    expect(onBackspace).toHaveBeenCalledTimes(1);
  });

  it("toggles shift to shift layout and toggles language", () => {
    const onChar = vi.fn();
    render(
      <ThaiKeyboard
        onChar={onChar}
        onBackspace={vi.fn()}
        onSpace={vi.fn()}
      />
    );

    // Toggle Shift
    const shiftBtn = screen.getByRole("button", { name: /ยกแคร่/ });
    fireEvent.click(shiftBtn);

    // In Thai shifted layout, "๑" is present
    const keyOne = screen.getByRole("button", { name: "๑" });
    expect(keyOne).toBeInTheDocument();

    // Toggle Language to English
    const langBtn = screen.getByRole("button", { name: /ไทย → EN/ });
    fireEvent.click(langBtn);

    // Now English lower keys should appear
    expect(screen.getByRole("button", { name: "q" })).toBeInTheDocument();
  });
});
