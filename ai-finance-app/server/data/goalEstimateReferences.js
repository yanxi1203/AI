export const GOAL_ESTIMATE_UPDATED_AT = '2026-09-03';

export const ESTIMATE_DISCLAIMER = '此為參考估算，並非即時報價。';

export const TRAVEL_REFERENCES = {
  japan: {
    match: /(日本|東京|大阪|京都|北海道|沖繩)/i,
    options: {
      economy: {
        transport: [8000, 12000, 10000],
        accommodationPerRoomNight: [2200, 3200, 2800],
        dailyPerPerson: [900, 1400, 1100],
        shopping: [3000, 6000, 4500],
        reserve: [1500, 2500, 2000]
      },
      balanced: {
        transport: [12000, 18000, 15000],
        accommodationPerRoomNight: [3400, 5000, 4200],
        dailyPerPerson: [1500, 2300, 1900],
        shopping: [5000, 10000, 7000],
        reserve: [2500, 4000, 3200]
      },
      comfortable: {
        transport: [18000, 26000, 22000],
        accommodationPerRoomNight: [5600, 8000, 6800],
        dailyPerPerson: [2500, 3600, 3000],
        shopping: [8000, 16000, 12000],
        reserve: [4000, 6500, 5000]
      }
    }
  }
};

export const COST_OPTION_LABELS = {
  economy: '省錢方案',
  balanced: '平衡方案',
  comfortable: '安心方案'
};

export const PRODUCT_REFERENCES = {
  computer: {
    usageBase: {
      office: 22000,
      graphic_design: 36000,
      development: 32000,
      gaming: 42000,
      video_3d: 52000,
      undecided: 30000
    },
    levelMultiplier: { entry: 0.82, balanced: 1, high_end: 1.48 },
    accessoryAmount: { economy: 1800, balanced: 3800, comfortable: 7500 }
  },
  phone: {
    usageBase: { general: 18000, photo: 26000, gaming: 28000, undecided: 20000 },
    levelMultiplier: { entry: 0.72, balanced: 1, high_end: 1.42 },
    accessoryAmount: { economy: 800, balanced: 1800, comfortable: 3500 }
  },
  camera: {
    usageBase: { general: 26000, photo: 40000, video_3d: 52000, undecided: 32000 },
    levelMultiplier: { entry: 0.78, balanced: 1, high_end: 1.5 },
    accessoryAmount: { economy: 2500, balanced: 6000, comfortable: 12000 }
  }
};
