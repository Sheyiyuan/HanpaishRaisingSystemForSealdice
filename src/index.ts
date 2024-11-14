import {
  calculateDiceExpression,
  getGift,
  getName,
  handleCheckIn
} from "./utils";

function main() {
  // 注册扩展
  let ext = seal.ext.find('HanpaishRaisingSystem');
  if (!ext) {
    ext = seal.ext.new('HanpaishRaisingSystem', 'Sheyiyuan', '1.0.0');
    seal.ext.register(ext);
    seal.ext.registerStringConfig(ext, '骰子名字', '半拍', "骰子的名字，将决定骰子如何称呼自己");
    seal.ext.registerStringConfig(ext, '对玩家称呼的前缀', '', "对玩家称呼的前缀，可留空")
    seal.ext.registerBoolConfig(ext, '是否称呼玩家名字', true)
    seal.ext.registerStringConfig(ext, '对玩家称呼的后缀', '老师', "对玩家称呼的后缀，可留空")
    seal.ext.registerStringConfig(ext, '货币名称/单位（不可留空！）', '信用点', "货币名称/单位，在数据库中使用初阶豹语的${m余额}储存")
    seal.ext.registerStringConfig(ext, '打卡行为名称', '打卡', "骰子将用这一名称称呼群内的打卡行为，建议词形如：祈祷、打卡、签到\n不是指令!不是指令！不是指令！")
    //商店系统开发中
    // seal.ext.registerBoolConfig(ext, '启用使用商店购买', true, "启用后玩家需要的在商店购买商品后才能送礼")
    // seal.ext.registerTemplateConfig(ext, '商店物品栏', [""], "启用后玩家只能购买在此栏目中列出的商品，留空则不限制")
    // seal.ext.registerIntConfig(ext, '商店物品价格', 100, "商店中每件商品的价格")
    // seal.ext.registerIntConfig(ext, '玩家背包容量', 0, "玩家背包容量，即玩家最多可以购买的商品数量，填写0则不限制")
    seal.ext.registerIntConfig(ext, '玩家送礼冷却时间', 0, "玩家需要等待多少时间（单位：秒）才能再次送礼，填写0则不限制")
    seal.ext.registerTemplateConfig(ext, '礼物白名单', ["冰淇凌", "冰淇淋", "麦旋风", "小团子", "法棍", "fu", "最终物语", "大成功"])
    seal.ext.registerIntConfig(ext, '白名单价格', 3000, "白名单中每件礼物的价格")
    seal.ext.registerStringConfig(ext, '白名单好感度', '4d2', "白名单中每件礼物的好感度，可用掷骰表达式")
    seal.ext.registerTemplateConfig(ext, '礼物黑名单', ["香菜", "切片肉粽", "作业", "大失败", "bug", "早八", "高等代数"])
    seal.ext.registerIntConfig(ext, '黑名单价格', 5000, "黑名单中每件礼物的价格")
    seal.ext.registerStringConfig(ext, '黑名单减少好感度', '1d4', "黑名单中每件礼物的好感度减少量，可用掷骰表达式")
    seal.ext.registerIntConfig(ext, '普通礼物价格', 2000)
    seal.ext.registerStringConfig(ext, '普通礼物好感度', '2d2', "普通礼物的好感度，可用掷骰表达式")
    seal.ext.registerIntConfig(ext, '打卡初始货币值', 7500, "群内初始每日打卡获得的货币数量")
    seal.ext.registerIntConfig(ext, '打卡次序递减货币值', 500, "群内按照每日打卡次序递减的货币获取量，即每日打卡人比前一名少得到的货币数量，填写0则不递减")
    seal.ext.registerIntConfig(ext, '打卡最低货币值', 5000, "群内每日打卡最低获得的货币数量")
    seal.ext.registerTemplateConfig(ext, '白名单礼物回复语句', [`半拍看上去很开心，"谢谢老师"`], "白名单礼物被送出时回复的语句，会从填写的语句中随机选择一条")
    seal.ext.registerTemplateConfig(ext, '黑名单礼物回复语句', [`"诶？谢...谢谢......"，半拍的脸上没有表情。`], "黑名单礼物被送出时回复的语句，会从填写的语句中随机选择一条")
    seal.ext.registerTemplateConfig(ext, '普通礼物回复语句', [`"唔......谢谢老师的礼物了。"`], "普通礼物被送出时回复的语句，会从填写的语句中随机选择一条")
    seal.ext.registerTemplateConfig(ext, '余额不足回复语句', [`你翻了翻口袋，自己的余额似乎不太支持你的想法`], "玩家余额不足时回复的语句，会从填写的语句中随机选择一条")
    seal.ext.registerStringConfig(ext, '打卡指令', "打卡", "群内指令，玩家输入该指令后可以进行一次打卡(相当于自定义回复，无需使用'。'等提示符，下同)")
    seal.ext.registerStringConfig(ext, '余额查询指令', "查询余额", "群内指令，玩家输入该指令后可以查询自己的余额")
    // seal.ext.registerTemplateConfig(ext, '购买指令', ["购买"], "群内指令，玩家输入“指令+商品名称”后可以购买礼物，如：购买法棍")
    seal.ext.registerTemplateConfig(ext, '赠送指令', ["赠送", "给半拍"], "群内指令，玩家输入“指令+礼物名称”后可以赠送礼物，如：给半拍法棍")
    seal.ext.registerStringConfig(ext, '好感度查询指令', "查询好感度", "群内指令，玩家输入该指令后可以查询自己的好感度")
  }

  ext.onNotCommandReceived = (ctx, msg) => {
    //首先读取指令配置
    let checkInCommand = seal.ext.getStringConfig(ext, '打卡指令');
    let giftCommand = seal.ext.getTemplateConfig(ext, '赠送指令');
    let queryCommand = seal.ext.getStringConfig(ext, '余额查询指令');
    let queryFeelingCommand = seal.ext.getStringConfig(ext, '好感度查询指令');

    //读取名称配置

    //处理信息
    let message = msg.message;
    if (message === checkInCommand) {
      let CheckResult = handleCheckIn(ctx, ext);
      let nameList = getName(ctx, ext);
      let reply: string;
      if (!CheckResult) {
        reply = `${nameList.playerName}今天已经打过卡了，请明天再来吧！`;
        seal.replyToSender(ctx, msg, reply);
        return;
      }
      reply = `${nameList.playerName}在今天群内第${CheckResult.checkInOrder}个${nameList.checkInName}，获得了${CheckResult.TotalReward}个${nameList.currencyName}。当前余额为${CheckResult.playerBalance}。`;
      seal.replyToSender(ctx, msg, reply);
    }
    if (message === queryCommand) {
      let playerBalance = seal.vars.intGet(ctx, '$m余额')[0]
      let nameList = getName(ctx, ext);
      let reply = `${nameList.playerName}当前拥有${playerBalance}${nameList.currencyName}。`;
      seal.replyToSender(ctx, msg, reply);
    }
    if (message === queryFeelingCommand) {
      let playerFeeling = seal.vars.intGet(ctx, `$m好感度`)[0]
      let nameList = getName(ctx, ext);
      let reply = `${nameList.selfName}对${nameList.playerName}的好感度为${playerFeeling}。`;
      seal.replyToSender(ctx, msg, reply);
    }
    //处理礼物
    for (let i = 0; i < giftCommand.length; i++) {
      if (message.startsWith(giftCommand[i])) {
        let messagePart = message.substring(giftCommand[i].length)
        let nameList = getName(ctx, ext);
        let playerBalance = seal.vars.intGet(ctx, '$m余额')[0];
        let giftList = getGift(ext);
        let playerFeeling = seal.vars.intGet(ctx, `$m好感度`)[0];
        if (messagePart === '') {
          return
        }
        if (giftList.whiteList.includes(messagePart)) {
          if (playerBalance < giftList.whitePrice) {
            let reply = giftList.notEnoughReply[Math.floor(Math.random() * giftList.notEnoughReply.length)];
            seal.replyToSender(ctx, msg, reply);
            return;
          }
          playerBalance -= giftList.whitePrice;
          let FeelingChange = calculateDiceExpression(seal.ext.getStringConfig(ext, '白名单好感度'));
          if (isNaN(FeelingChange)) {
            seal.replyToSender(ctx, msg, "Error:‘白名单好感度’配置项有误，请联系骰主检查配置！，请联系骰主检查配置！")
            return
          }
          playerFeeling += FeelingChange;
          seal.vars.intSet(ctx, `$m好感度`, playerFeeling);
          let reply = giftList.whiteReply[Math.floor(Math.random() * giftList.whiteReply.length)];
          reply += `\n${nameList.selfName}对${nameList.playerName}的好感度增加了${FeelingChange}。`;
          seal.replyToSender(ctx, msg, reply);
          seal.vars.intSet(ctx, `$m余额`, playerBalance);
        } else if (giftList.blackList.includes(messagePart)) {
          if (playerBalance < giftList.blackPrice) {
            let reply = giftList.notEnoughReply[Math.floor(Math.random() * giftList.notEnoughReply.length)];
            seal.replyToSender(ctx, msg, reply);
            return;
          }
          playerBalance -= giftList.blackPrice;
          let FeelingChange = calculateDiceExpression(seal.ext.getStringConfig(ext, '黑名单减少好感度'));
          if (isNaN(FeelingChange)) {
            seal.replyToSender(ctx, msg, "Error:‘黑名单减少好感度’配置项有误，请联系骰主检查配置！")
            return
          }
          playerFeeling -= FeelingChange;
          seal.vars.intSet(ctx, `$m好感度`, playerFeeling);
          let reply = giftList.blackReply[Math.floor(Math.random() * giftList.blackReply.length)];
          seal.replyToSender(ctx, msg, reply);
          seal.vars.intSet(ctx, `$m余额`, playerBalance);
        } else {
          if (playerBalance < giftList.normalPrice) {
            let reply = giftList.notEnoughReply[Math.floor(Math.random() * giftList.notEnoughReply.length)];
            seal.replyToSender(ctx, msg, reply);
            return;
          }
          playerBalance -= giftList.normalPrice;
          let FeelingChange = calculateDiceExpression(seal.ext.getStringConfig(ext, '普通礼物好感度'));
          if (isNaN(FeelingChange)) {
            seal.replyToSender(ctx, msg, "Error:‘普通礼物好感度’配置项有误，请联系骰主检查配置！")
            return
          }
          playerFeeling += FeelingChange;
          seal.vars.intSet(ctx, `$m好感度`, playerFeeling);
          let reply = giftList.normalReply[Math.floor(Math.random() * giftList.normalReply.length)];
          reply += `\n${nameList.selfName}对${nameList.playerName}的好感度增加了${FeelingChange}。`;
          seal.replyToSender(ctx, msg, reply);
          seal.vars.intSet(ctx, `$m余额`, playerBalance);
        }
      }
    }
  }
}

main();
