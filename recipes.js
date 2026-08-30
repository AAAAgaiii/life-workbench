// 灵感来源菜谱库（group 用于「今日推荐搭配」分类；ingredients 用于食材匹配）
const RECIPE_DB = [
  // 主食
  { name: "白米饭", group: "主食", time: "15min", ingredients: ["大米", "米饭"] },
  { name: "糙米饭", group: "主食", time: "30min", ingredients: ["糙米"] },
  { name: "全麦三明治", group: "主食", time: "10min", ingredients: ["全麦面包", "鸡蛋", "生菜"] },
  { name: "燕麦牛奶粥", group: "主食", time: "8min", ingredients: ["燕麦片", "牛奶"] },
  { name: "蒸红薯", group: "主食", time: "20min", ingredients: ["红薯"] },
  // 蛋白质
  { name: "煎鸡胸肉", group: "蛋白质", time: "15min", ingredients: ["鸡胸肉", "黑胡椒", "橄榄油"] },
  { name: "水煮蛋", group: "蛋白质", time: "10min", ingredients: ["鸡蛋"] },
  { name: "番茄炒蛋", group: "蛋白质", time: "10min", ingredients: ["鸡蛋", "番茄"] },
  { name: "香煎牛排", group: "蛋白质", time: "15min", ingredients: ["牛里脊", "黑胡椒", "黄油"] },
  { name: "清蒸鲈鱼", group: "蛋白质", time: "20min", ingredients: ["鲈鱼", "姜", "葱"] },
  { name: "虾仁炒蛋", group: "蛋白质", time: "10min", ingredients: ["虾仁", "鸡蛋"] },
  { name: "香菇豆腐煲", group: "蛋白质", time: "15min", ingredients: ["豆腐", "香菇"] },
  { name: "希腊酸奶杯", group: "蛋白质", time: "3min", ingredients: ["希腊酸奶", "蓝莓"] },
  // 蔬菜
  { name: "蒜蓉西兰花", group: "蔬菜", time: "10min", ingredients: ["西兰花", "蒜"] },
  { name: "凉拌黄瓜", group: "蔬菜", time: "5min", ingredients: ["黄瓜", "蒜"] },
  { name: "清炒菠菜", group: "蔬菜", time: "8min", ingredients: ["菠菜", "蒜"] },
  { name: "牛油果沙拉", group: "蔬菜", time: "10min", ingredients: ["生菜", "番茄", "牛油果"] },
  { name: "醋溜白菜", group: "蔬菜", time: "10min", ingredients: ["白菜", "醋"] },
  // 汤羹
  { name: "紫菜蛋花汤", group: "汤羹", time: "8min", ingredients: ["紫菜", "鸡蛋"] },
  { name: "番茄牛腩汤", group: "汤羹", time: "40min", ingredients: ["番茄", "牛腩"] },
  { name: "冬瓜排骨汤", group: "汤羹", time: "50min", ingredients: ["冬瓜", "排骨"] },
  { name: "蘑菇洋葱汤", group: "汤羹", time: "20min", ingredients: ["蘑菇", "洋葱"] },
];