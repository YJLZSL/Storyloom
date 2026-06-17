// 故事结构模板定义

export interface StoryTemplateTrack {
  name: string;
  color: string;
  description?: string;
}

export interface StoryTemplateEvent {
  title: string;
  description: string;
  trackIndex: number;
  startTime: number;
  endTime: number;
}

export interface StoryTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  tracks: StoryTemplateTrack[];
  events: StoryTemplateEvent[];
}

const DAY = 86_400_000;

export const STORY_TEMPLATES: StoryTemplate[] = [
  {
    id: 'heros-journey',
    name: '英雄之旅',
    description: '12 阶段经典叙事结构',
    icon: 'Compass',
    tracks: [
      { name: '主线旅程', color: '#3b82f6', description: '英雄的外在冒险主线' },
      { name: '内心成长', color: '#10b981', description: '英雄的内在转变弧线' },
      { name: '考验遭遇', color: '#ef4444', description: '挑战、敌人与关键考验' },
    ],
    events: [
      { title: '平凡世界', description: '英雄在习以为常的生活中登场，建立背景与性格基调。', trackIndex: 0, startTime: 0, endTime: DAY },
      { title: '冒险召唤', description: '一个事件或消息打破平静，召唤英雄踏上未知旅程。', trackIndex: 0, startTime: DAY, endTime: 2 * DAY },
      { title: '拒绝召唤', description: '英雄出于恐惧或责任 initially 拒绝冒险，展现内心冲突。', trackIndex: 1, startTime: 2 * DAY, endTime: 3 * DAY },
      { title: '遇见导师', description: '英雄遇到智者或导师，获得指引、装备或信心。', trackIndex: 1, startTime: 3 * DAY, endTime: 4 * DAY },
      { title: '跨越第一道门槛', description: '英雄正式离开旧世界，进入冒险的特殊领域。', trackIndex: 0, startTime: 4 * DAY, endTime: 5 * DAY },
      { title: '考验、盟友与敌人', description: '英雄在试炼中结识伙伴、辨识敌人，能力得到检验。', trackIndex: 2, startTime: 5 * DAY, endTime: 6 * DAY },
      { title: '接近深处洞穴', description: '英雄逼近最危险的地方或最核心的真相，准备面对恐惧。', trackIndex: 0, startTime: 6 * DAY, endTime: 7 * DAY },
      { title: '严峻考验', description: '英雄经历生死攸关的考验，旧我死去、新我即将诞生。', trackIndex: 2, startTime: 7 * DAY, endTime: 8 * DAY },
      { title: '获得报酬', description: '通过考验后，英雄取得宝物、知识或力量作为回报。', trackIndex: 0, startTime: 8 * DAY, endTime: 9 * DAY },
      { title: '回归之路', description: '英雄启程返回，但新的危险与追逐随之而来。', trackIndex: 0, startTime: 9 * DAY, endTime: 10 * DAY },
      { title: '复活', description: '英雄在归途面临最终净化与考验，完成彻底的转变。', trackIndex: 2, startTime: 10 * DAY, endTime: 11 * DAY },
      { title: '带回灵药', description: '英雄带着改变世界的礼物回到平凡世界，旅程圆满。', trackIndex: 1, startTime: 11 * DAY, endTime: 12 * DAY },
    ],
  },
  {
    id: 'three-act',
    name: '三幕式',
    description: '建置—对抗—结局的经典戏剧结构',
    icon: 'Layers',
    tracks: [
      { name: '第一幕', color: '#3b82f6', description: '建置：人物、世界与激励事件' },
      { name: '第二幕', color: '#f59e0b', description: '对抗：冲突升级与中点转折' },
      { name: '第三幕', color: '#10b981', description: '结局：高潮与收束' },
    ],
    events: [
      { title: '开场画面', description: '以一个具有象征意味的画面切入，奠定基调与主题。', trackIndex: 0, startTime: 0, endTime: DAY },
      { title: '激励事件', description: '打破平衡的事件发生，主角被迫面对改变。', trackIndex: 0, startTime: DAY, endTime: 2 * DAY },
      { title: '第一幕转折点', description: '主角做出决定，正式进入第二幕的冲突世界。', trackIndex: 0, startTime: 2 * DAY, endTime: 3 * DAY },
      { title: '中点', description: '故事中段出现重大转折，主角从被动转向主动。', trackIndex: 1, startTime: 4 * DAY, endTime: 5 * DAY },
      { title: '第二幕转折点', description: '危机加剧，主角陷入最低谷，被迫做出关键抉择。', trackIndex: 1, startTime: 6 * DAY, endTime: 7 * DAY },
      { title: '高潮', description: '主角与对手正面交锋，冲突达到最高点。', trackIndex: 2, startTime: 8 * DAY, endTime: 9 * DAY },
      { title: '结局', description: '冲突解决，新的平衡建立，呼应开场画面。', trackIndex: 2, startTime: 9 * DAY, endTime: 10 * DAY },
    ],
  },
  {
    id: 'save-the-cat',
    name: '拯救猫咪',
    description: '15 节拍电影编剧结构',
    icon: 'Film',
    tracks: [
      { name: 'A 故事', color: '#3b82f6', description: '主线剧情推进' },
      { name: 'B 故事', color: '#ec4899', description: '情感与关系副线' },
      { name: '主题线', color: '#8b5cf6', description: '主题与意象呼应' },
    ],
    events: [
      { title: '开场画面', description: '用一个画面展示主角的初始状态，暗示主题。', trackIndex: 0, startTime: 0, endTime: DAY },
      { title: '主题宣示', description: '某角色（常为非主角）点明故事的主题或教训。', trackIndex: 2, startTime: 0, endTime: DAY },
      { title: '布局', description: '展示主角的生活、缺陷与世界，为后续铺垫。', trackIndex: 0, startTime: DAY, endTime: 2 * DAY },
      { title: '触发事件', description: '改变一切的契机降临，打破主角的日常。', trackIndex: 0, startTime: 2 * DAY, endTime: 3 * DAY },
      { title: '辩论', description: '主角犹豫是否接受改变，展现内心挣扎。', trackIndex: 0, startTime: 3 * DAY, endTime: 4 * DAY },
      { title: '第二幕', description: '主角做出选择，跨入全新的故事世界。', trackIndex: 0, startTime: 4 * DAY, endTime: 5 * DAY },
      { title: 'B 故事', description: '一条承载主题的副线展开，常与感情相关。', trackIndex: 1, startTime: 4 * DAY, endTime: 5 * DAY },
      { title: '乐趣与游戏', description: '故事的承诺兑现，主角在新世界中探索与冒险。', trackIndex: 0, startTime: 5 * DAY, endTime: 6 * DAY },
      { title: '中点', description: '虚假胜利或虚假失败，故事基调发生反转。', trackIndex: 0, startTime: 6 * DAY, endTime: 7 * DAY },
      { title: '坏人逼近', description: '反派势力加强，内部矛盾浮现，压力升级。', trackIndex: 0, startTime: 7 * DAY, endTime: 8 * DAY },
      { title: '一无所有', description: '主角遭遇重大挫败，看似失去一切。', trackIndex: 0, startTime: 8 * DAY, endTime: 9 * DAY },
      { title: '灵魂黑夜', description: '主角陷入绝望与反思，在谷底寻找答案。', trackIndex: 1, startTime: 9 * DAY, endTime: 10 * DAY },
      { title: '第三幕', description: '主角找到解决方案，主动发起最终行动。', trackIndex: 0, startTime: 10 * DAY, endTime: 11 * DAY },
      { title: '高潮', description: '主角运用所学与对手决战，完成内在转变。', trackIndex: 0, startTime: 11 * DAY, endTime: 12 * DAY },
      { title: '终场画面', description: '以呼应开场的画面收尾，展示主角的变化。', trackIndex: 0, startTime: 12 * DAY, endTime: 13 * DAY },
    ],
  },
  {
    id: 'chronicle',
    name: '编年体',
    description: '按时间顺序记录兴衰历程',
    icon: 'ScrollText',
    tracks: [
      { name: '政治军事', color: '#ef4444', description: '政权更迭与重大战事' },
      { name: '社会经济', color: '#f59e0b', description: '经济民生与社会变迁' },
      { name: '文化科技', color: '#8b5cf6', description: '思想、艺术与技术创新' },
    ],
    events: [
      { title: '起源', description: '记述对象的开端：建国、立业或事件初起。', trackIndex: 0, startTime: 0, endTime: 2 * DAY },
      { title: '发展', description: '逐步壮大，制度与社会结构成形。', trackIndex: 1, startTime: 2 * DAY, endTime: 4 * DAY },
      { title: '鼎盛', description: '达到全盛，文治武功与经济文化齐备。', trackIndex: 2, startTime: 4 * DAY, endTime: 6 * DAY },
      { title: '转折', description: '由盛转衰的关键节点，危机初现。', trackIndex: 0, startTime: 6 * DAY, endTime: 8 * DAY },
      { title: '衰落', description: '积弊爆发，内外交困走向没落。', trackIndex: 1, startTime: 8 * DAY, endTime: 10 * DAY },
      { title: '余响', description: '终结之后的影响与后世评价。', trackIndex: 2, startTime: 10 * DAY, endTime: 12 * DAY },
    ],
  },
  {
    id: 'biography',
    name: '传记体',
    description: '以人物生平为主线的叙事',
    icon: 'User',
    tracks: [
      { name: '个人生活', color: '#3b82f6', description: '家庭、情感与私人经历' },
      { name: '事业成就', color: '#10b981', description: '事业轨迹与主要贡献' },
      { name: '时代背景', color: '#6b7280', description: '所处时代与社会环境' },
    ],
    events: [
      { title: '出生与家世', description: '传主的出身、家族背景与时代背景。', trackIndex: 0, startTime: 0, endTime: 2 * DAY },
      { title: '成长与教育', description: '童年经历、求学过程与性格养成。', trackIndex: 0, startTime: 2 * DAY, endTime: 4 * DAY },
      { title: '事业起步', description: '初入社会或行业的探索与早期挫折。', trackIndex: 1, startTime: 4 * DAY, endTime: 6 * DAY },
      { title: '主要成就', description: '人生的高光时刻与核心贡献。', trackIndex: 1, startTime: 6 * DAY, endTime: 8 * DAY },
      { title: '晚年', description: '人生的收束阶段，回顾与沉淀。', trackIndex: 0, startTime: 8 * DAY, endTime: 10 * DAY },
      { title: '影响与评价', description: '身后影响、历史地位与后世评价。', trackIndex: 2, startTime: 10 * DAY, endTime: 12 * DAY },
    ],
  },
];

export function getStoryTemplate(id: string): StoryTemplate | undefined {
  return STORY_TEMPLATES.find((t) => t.id === id);
}
