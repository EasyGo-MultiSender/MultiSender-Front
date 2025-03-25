/**
 * アプリケーションで使用するカラーパレット
 */

// パープル系
export const PURPLE = {
  DARK: '#1E003E', // ダークパープル
  MEDIUM: '#251C59', // ミディアムパープル
  LIGHT: '#A49CD7', // ライトパープル
  BRIGHT: '#9A07D9', // ブライトパープル
  MEDIUM_BRIGHT: '#5542AD', // ミディアムブライトパープル
  LIGHT_BRIGHT: '#7867EA', // ライトブライトパープル
};

// グレー系
export const GRAY = {
  DARK: '#000000', // ブラック
  MEDIUM_DARK: '#737373', // ミディアムダークグレー
  MEDIUM: '#A4A4A4', // ミディアムグレー
  LIGHT: '#FFFFFF', // ホワイト
};

// ブルー系
export const BLUE = {
  TURQUOISE: '#03DBE4', // ターコイズブルー
  DARK: '#2D2CCE', // ダークブルー
};

// ピンク系
export const PINK = {
  HOT: '#FA179E', // ホットピンク
};

// グラデーション
export const GRADIENTS = {
  PURPLE_TO_LAVENDER: 'linear-gradient(90deg, #C417E7 0%, #9B8CFF 100%)',
  BLUE_TO_TEAL: 'linear-gradient(90deg, #03B0E4 0%, #02D7B7 100%)',
  PINK_TO_PURPLE: 'linear-gradient(90deg, #FC00FF 0%, #6A3FEA 100%)',
  LIGHT_PURPLE:
    'linear-gradient(135deg, #D5CEFF 0%, #EFECFF 46.08%, #FEFEFF 100%)',
};

// カラーパレット全体
export const COLORS = {
  PURPLE,
  GRAY,
  BLUE,
  PINK,
  GRADIENTS,
};

export default COLORS;
