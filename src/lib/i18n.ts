export type Language = 'en' | 'ru';

export const translations = {
  en: {
    app: {
      title: 'LatheCAM 210',
      undo: 'Undo',
      redo: 'Redo',
      presetPawn: 'Chess Pawn',
      presetCone: 'Simple Cone',
      settings: 'Settings',
      saveCode: 'Save .nc',
      tab2d: '2D Sketch',
      tab3d: '3D Part',
      tabSim: 'Simulation',
      tabCode: 'G-Code'
    },
    settings: {
      title: 'Machining Setup',
      stockGeometry: 'Stock Geometry',
      diameter: 'Diameter (X) mm',
      length: 'Length (Z) mm',
      cuttingTool: 'Cutting Tool',
      noseRadius: 'Nose Radius (mm)',
      roughingAllowance: 'Finishing Allowance',
      opsAndFeeds: 'Operations & Feeds',
      facing: 'Facing (Z=0)',
      roughingPasses: 'Roughing Passes',
      depthOfCut: 'Depth of Cut (Diameter)',
      depthOfCutTooltip: 'Material removed per pass on DIAMETER. 0.5mm here means 0.25mm per side.',
      finishingPass: 'Finishing Pass',
      partingOff: 'Parting Off',
      roughingFeed: 'Feedrate (mm/min)',
      feedTooltip: 'Feedrate in mm/min. Standard default is ~100. This is the F value in G-code.',
      spindleSpeed: 'Spindle RPM (S)',
      postProcessor: 'Post Processor',
      headerLines: 'Header Lines',
      footerLines: 'Footer Lines'
    },
    profile: {
      title: 'Part Profile',
      addPoint: 'Add Point',
      zLength: 'Z (Length)',
      xRadius: 'X (Radius)',
      rFillet: 'R (Fillet)',
      actions: 'Del',
      profileTip: 'Start from the right side (Z max) down to the chuck (Z=0).'
    },
    view2d: {
      chuck: 'CHUCK',
      origin: 'TOUCH-OFF (G92)',
      rawStock: 'Raw Stock',
      partProfile: 'Part Profile'
    },
    sim: {
      play: 'Play Simulation',
      pause: 'Pause Simulation'
    }
  },
  ru: {
    app: {
      title: 'Токарка 210',
      undo: 'Отменить',
      redo: 'Повторить',
      presetPawn: 'Пешка',
      presetCone: 'Конус',
      settings: 'Настройки',
      saveCode: 'Скачать .nc',
      tab2d: '2D Чертеж',
      tab3d: '3D Деталь',
      tabSim: 'Симуляция',
      tabCode: 'G-Code'
    },
    settings: {
      title: 'Настройки станка',
      stockGeometry: 'Габариты заготовки',
      diameter: 'Диаметр (X) мм',
      length: 'Длина (Z) мм',
      cuttingTool: 'Резец (Инструмент)',
      noseRadius: 'Радиус кромки (мм)',
      roughingAllowance: 'Припуск на чистовую',
      opsAndFeeds: 'Операции и Подачи',
      facing: 'Торцевание (Z=0)',
      roughingPasses: 'Черновая обдирка',
      depthOfCut: 'Съем за проход (на Диаметр)',
      depthOfCutTooltip: 'Глубина съема на диаметр! Указание 0.5 мм означает съем 0.25 мм на сторону (на радиус).',
      finishingPass: 'Чистовой проход',
      partingOff: 'Отрезка',
      roughingFeed: 'Подача (мм/мин)',
      feedTooltip: 'Скорость рабочей подачи в мм/мин. Стандартное значение ~100. Это параметр F в G-коде.',
      spindleSpeed: 'Обороты шпинделя (S)',
      postProcessor: 'Настройки G-кода',
      headerLines: 'Начало кода (Шапка)',
      footerLines: 'Конец кода (Подвал)'
    },
    profile: {
      title: 'Профиль детали',
      addPoint: 'Добавить',
      zLength: 'Z (Длина)',
      xRadius: 'X (Радиус)',
      rFillet: 'R (Скругление)',
      actions: 'Удал',
      profileTip: 'Точки идут справа-налево: от края заготовки (макс Z) к патрону (Z=0).'
    },
    view2d: {
      chuck: 'ПАТРОН',
      origin: 'КАСАНИЕ (G92)',
      rawStock: 'Заготовка',
      partProfile: 'Деталь'
    },
    sim: {
      play: 'Запустить',
      pause: 'Пауза'
    }
  }
};

export const t = (key: string, lang: Language): string => {
  const keys = key.split('.');
  let current: any = translations[lang];
  for (const k of keys) {
    if (current === undefined) return key;
    current = current[k];
  }
  return current || key;
};
