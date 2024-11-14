/**
 * 生成一个随机数并根据给定的参数进行计算
 * @description (n,x,k,p,c)=(nDx+p)*k+c
 * @param n - 骰子的数量
 * @param x - 骰子的面数
 * @param k - 加权值，默认为 1
 * @param p - 第一修正值，默认为 0
 * @param c - 第二修正值，默认为 0
 * @returns 计算后的结果
 */
function D(n: number, x: number, k = 1, p = 0, c = 0) {
  let sum = 0;
  let sumPlus: number;
  for (let i = 0; i < n; i++) {
    let randomNumber = Math.floor(Math.random() * x) + 1;
    sum += randomNumber;
  }
  sum += p;
  sumPlus = sum * k + c;
  return sumPlus;
}

// 类型定义
interface TimeNowResult {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hours: number;
  minutes: number;
  seconds: number;
}

// 获取当前时间
function timeNow(): TimeNowResult {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const day = currentDate.getDate();
  const weekday = currentDate.getDay();
  const hours = currentDate.getHours();
  const minutes = currentDate.getMinutes();
  const seconds = currentDate.getSeconds();
  return {year, month, day, weekday, hours, minutes, seconds};
}

// 处理签到
export function handleCheckIn(ctx: seal.MsgContext, ext: seal.ExtInfo) {
  const status = D(1, 100, 1, 0, 0)
  seal.vars.intSet(ctx, `$mStatusOfHanpaishRaisingSystem`, status)
  const currentTime = timeNow();
  const currentDate = Number(`${currentTime.year}${currentTime.month}${currentTime.day}`);

  let previousDate = seal.vars.intGet(ctx, `$g打卡日期`)[0];
  let checkInOrder = seal.vars.intGet(ctx, `$g打卡次序`)[0];
  let lastCheckInDate = seal.vars.intGet(ctx, `$m玩家上次打卡日期`)[0];
  let playerBalance = seal.vars.intGet(ctx, `$m余额`)[0];

  if (lastCheckInDate === currentDate) {
    return false;
  }

  if (currentDate !== previousDate) {
    checkInOrder = 1;
  } else {
    checkInOrder += 1;
  }

  seal.vars.intSet(ctx, `$g打卡日期`, currentDate);
  seal.vars.intSet(ctx, `$g打卡次序`, checkInOrder);
  const BaseReward = seal.ext.getIntConfig(ext, '打卡初始货币值');
  const BonusCommonDifference = seal.ext.getIntConfig(ext, '打卡次序递减货币值');
  const LowestBonus = seal.ext.getIntConfig(ext, '打卡最低货币值');
  let TotalReward = BaseReward - (checkInOrder - 1) * BonusCommonDifference
  if (TotalReward < LowestBonus) {
    TotalReward = LowestBonus
  }
  playerBalance += TotalReward;
  seal.vars.intSet(ctx, `$m余额`, playerBalance);
  seal.vars.intSet(ctx, `$m玩家上次打卡日期`, currentDate);
  return {checkInOrder, TotalReward, playerBalance}
}

export function getName(ctx: seal.MsgContext, ext: seal.ExtInfo) {
  let prefix = seal.ext.getStringConfig(ext, '对玩家称呼的前缀');
  let suffix = seal.ext.getStringConfig(ext, '对玩家称呼的后缀');
  let currencyName = seal.ext.getStringConfig(ext, '货币名称/单位（不可留空！）');
  let isCallPlayerName = seal.ext.getBoolConfig(ext, '是否称呼玩家名字');
  let playerName = ctx.player.name;
  if (isCallPlayerName) {
    playerName = prefix + playerName + suffix;
  }
  let selfName = seal.ext.getStringConfig(ext, '骰子名字');
  let checkInName = seal.ext.getStringConfig(ext, '打卡行为名称');
  return {playerName, selfName, currencyName, checkInName}
}

export function getGift(ext: seal.ExtInfo) {
  let whiteList = seal.ext.getTemplateConfig(ext, '礼物白名单');
  let blackList = seal.ext.getTemplateConfig(ext, '礼物黑名单');
  let whitePrice = seal.ext.getIntConfig(ext, '白名单价格');
  let blackPrice = seal.ext.getIntConfig(ext, '黑名单价格');
  let normalPrice = seal.ext.getIntConfig(ext, '普通礼物价格');
  let whiteFeeling = seal.ext.getStringConfig(ext, '白名单好感度');
  let blackFeeling = seal.ext.getStringConfig(ext, '黑名单减少好感度');
  let normalFeeling = seal.ext.getStringConfig(ext, '普通礼物好感度');
  let whiteReply = seal.ext.getTemplateConfig(ext, '白名单礼物回复语句');
  let blackReply = seal.ext.getTemplateConfig(ext, '黑名单礼物回复语句');
  let normalReply = seal.ext.getTemplateConfig(ext, '普通礼物回复语句');
  let notEnoughReply = seal.ext.getTemplateConfig(ext, '余额不足回复语句');
  let cooldownTime = seal.ext.getIntConfig(ext, '玩家送礼冷却时间');
  return {
    whiteList,
    blackList,
    whitePrice, blackPrice, normalPrice,
    whiteFeeling, blackFeeling, normalFeeling,
    whiteReply, blackReply, normalReply,
    notEnoughReply,
    cooldownTime
  }
}

export function calculateDiceExpression(expression: string) {
  // 验证表达式是否合法
  const validExpressionPattern = /^[\d\s+\-*/]*(\d+d\d+[\d\s+\-*/]*)*$/;
  if (!validExpressionPattern.test(expression)) {
    return NaN;
  }

  // 使用正则表达式匹配骰子格式
  const dicePattern = /(\d+)d(\d+)/g;
  let result = expression;
  let match;
  while ((match = dicePattern.exec(expression)) !== null) {
    const numDice = parseInt(match[1]);
    const numSides = parseInt(match[2]);
    const diceRoll = D(numDice, numSides);
    result = result.replace(match[0], String(diceRoll));
  }

  // 将字符串拆分为操作数和操作符数组
  const tokens = result.match(/\d+|\+|\-|\*|\/|(?<!\d)(?=\d)|(?<=\d)(?!\d)/g);
  if (!tokens) return NaN;

  // 计算乘除
  let newTokens = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === '*') {
      let product = Number(newTokens.pop()) * Number(tokens[i + 1]);
      newTokens.push(product);
      i++;
    } else if (tokens[i] === '/') {
      let quotient = Number(newTokens.pop()) / Number(tokens[i + 1]);
      newTokens.push(quotient);
      i++;
    } else {
      newTokens.push(tokens[i]);
    }
  }

  // 计算加减
  let finalResult = Number(newTokens[0]);
  for (let j = 1; j < newTokens.length; j++) {
    if (newTokens[j] === '+') {
      finalResult += Number(newTokens[j + 1]);
    } else if (newTokens[j] === '-') {
      finalResult -= Number(newTokens[j + 1]);
    }
  }

  return finalResult;
}


