export interface ThemeConfig {
  name: string;
  isLight: boolean;
  rootBg: string;
  secondaryBg: string;
  textColor: string;
  secondaryTextColor: string;
  textColorCode: string;
  secondaryTextColorCode: string;
  cardBg: string;
  cardBgCode: string;
  secondaryBgCode: string;
  cardBorder: string;
  cardBorderCode: string;
  accentColor: string; // Primary accent: #FF3E00 (Orange) or #0B9EFE (Blue)
  secondaryAccentColor: string; // Secondary accent: #0B9EFE (Orange) or #FF3E00 (Blue)
  accentText: string;
  accentBg: string;
  inputBg: string;
  inputBorder: string;
  buttonBg: string;
  buttonText: string;
  secondaryButtonBg: string;
  secondaryButtonText: string;
  badgeBg: string;
  iconColor: string;
}

export const getThemeConfig = (themeName?: string, brandName: string = "orange"): ThemeConfig => {
  const isLight = themeName === "Day" || themeName === "Day Mode";
  const isBlue = brandName === "blue";

  const primaryColor = isBlue ? "#0B9EFE" : "#FF3E00";
  const secondaryColor = isBlue ? "#FF3E00" : "#0B9EFE";

  if (isLight) {
    return {
      name: "Day Mode",
      isLight: true,
      rootBg: "bg-[#FAFAFA]",
      secondaryBg: "bg-[#F5F5F5]",
      textColor: "text-[#000000]",
      secondaryTextColor: "text-[#444444]",
      textColorCode: "#000000",
      secondaryTextColorCode: "#444444",
      cardBg: "bg-[#FFFFFF]",
      cardBgCode: "#FFFFFF",
      secondaryBgCode: "#F5F5F5",
      cardBorder: "border-[#E5E5E5]",
      cardBorderCode: "#E5E5E5",
      accentColor: primaryColor,
      secondaryAccentColor: secondaryColor,
      accentText: `text-[${primaryColor}]`,
      accentBg: `bg-[${primaryColor}] text-white`,
      inputBg: "bg-[#F5F5F5]",
      inputBorder: "border-[#E5E5E5]",
      buttonBg: `bg-[${primaryColor}] text-white`,
      buttonText: "text-white",
      secondaryButtonBg: `bg-[#F5F5F5] text-[${secondaryColor}] border border-[${secondaryColor}]/40`,
      secondaryButtonText: `text-[${secondaryColor}]`,
      badgeBg: "bg-[#F5F5F5] text-[#444444] border border-[#E5E5E5]",
      iconColor: primaryColor,
    };
  }

  return {
    name: "Night Mode",
    isLight: false,
    rootBg: "bg-[#141414]",
    secondaryBg: "bg-[#0F0F0F]",
    textColor: "text-white",
    secondaryTextColor: "text-[#BDBDBD]",
    textColorCode: "#FFFFFF",
    secondaryTextColorCode: "#BDBDBD",
    cardBg: "bg-[#1A1A1A]",
    cardBgCode: "#1A1A1A",
    secondaryBgCode: "#0F0F0F",
    cardBorder: "border-transparent",
    cardBorderCode: "transparent",
    accentColor: primaryColor,
    secondaryAccentColor: secondaryColor,
    accentText: `text-[${primaryColor}]`,
    accentBg: `bg-[${primaryColor}] text-white`,
    inputBg: "bg-[#111111]",
    inputBorder: "border-transparent",
    buttonBg: `bg-[${primaryColor}] text-white`,
    buttonText: "text-white",
    secondaryButtonBg: `bg-[#111111] text-[${secondaryColor}] border-transparent`,
    secondaryButtonText: `text-[${secondaryColor}]`,
    badgeBg: "bg-[#111111] text-[#BDBDBD] border-transparent",
    iconColor: primaryColor,
  };
};

export const NIGHT_THEME = getThemeConfig("Night", "orange");
export const DAY_THEME = getThemeConfig("Day", "orange");

export const THEMES: Record<string, ThemeConfig> = {
  "Night": NIGHT_THEME,
  "Day": DAY_THEME,
  "Night Mode": NIGHT_THEME,
  "Day Mode": DAY_THEME,
};



