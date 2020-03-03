/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-disable import/no-unresolved */
import {dom, out, rule, ruleset, score, type} from "fathom-web";
import {euclidean} from "fathom-web/clusters";
import {isVisible, min} from "fathom-web/utilsForFrontend";

const coefficients = {
  "new": [
    ["hasPasswordLabel", 2.0694828033447266],
    ["hasNewLabel", -1.1102620363235474],
    ["hasConfirmLabel", 1.5610512495040894],
    ["hasNewPasswordLabel", 1.7947221994400024],
    ["hasConfirmPasswordLabel", 1.087942361831665],
    ["hasConfirmEmailLabel", -2.446869373321533],
    ["closestLabelMatchesPassword", 1.2149089574813843],
    ["closestLabelMatchesNew", 0.3049805760383606],
    ["closestLabelMatchesConfirm", 0.5655747652053833],
    ["closestLabelMatchesNewPassword", 1.8284662961959839],
    ["closestLabelMatchesConfirmPassword", 0.17259569466114044],
    ["closestLabelMatchesConfirmEmail", -1.6233612298965454],
    ["hasPasswordAriaLabel", 2.1855459213256836],
    ["hasNewAriaLabel", 0.6927503347396851],
    ["hasConfirmAriaLabel", 2.571136236190796],
    ["hasNewPasswordAriaLabel", 0.47767698764801025],
    ["hasConfirmPasswordAriaLabel", 0.4256565272808075],
    ["hasPasswordPlaceholder", 2.0468626022338867],
    ["hasNewPlaceholder", 0.739714503288269],
    ["hasConfirmPlaceholder", 0.7622326612472534],
    ["hasNewPasswordPlaceholder", 0.639854907989502],
    ["hasConfirmPasswordPlaceholder", 0.5716732740402222],
    ["hasConfirmEmailPlaceholder", 0.0855690985918045],
    ["forgotPasswordLinkInnerText", -2.348062753677368],
    ["forgotPasswordLinkHref", -3.2276556491851807],
    ["forgotPasswordLinkTitle", -3.1015498638153076],
    ["idIsPassword1Or2", 1.1725564002990723],
    ["nameIsPassword1Or2", 1.2064672708511353],
    ["idMatchesPassword", 1.95237135887146],
    ["nameMatchesPassword", 2.0143351554870605],
    ["idMatchesPasswordy", 2.1929826736450195],
    ["nameMatchesPasswordy", 2.7664480209350586],
    ["classMatchesPasswordy", 3.399362087249756],
    ["containingFormHasLoginAction", -0.8223199844360352],
    ["containingFormHasLoginId", 0.7332413792610168],
    ["formButtonIsRegistery", -1.0084218978881836],
    ["formButtonIsLoginy", -3.287984848022461],
  ]
};

const biases = [
  ["new", -2.771840810775757]
];

const passwordRegex = /password|passwort|رمز عبور|mot de passe|パスワード|신규 비밀번호|wachtwoord|senha|Пароль|parol|密码|contraseña/i;
const newRegex = /erstellen|create|choose|設定/i;
const confirmRegex = /wiederholen|wiederholung|confirm|repeat|confirmation|verify|retype|repite|確認|の確認|تکرار|re-enter|확인|bevestigen|confirme|Повторите|tassyklamak|再次输入/i;
const emailRegex = /e-mail|email|ایمیل|メールアドレス|이메일|邮箱/i;
const forgotPasswordInnerTextRegex = /vergessen|forgot|oublié|dimenticata|Esqueceu|Забыли|忘记|找回/i;
const forgotPasswordHrefRegex = /forgot|reset|recovery|change/i;
const password1Or2Regex = /password1|password2/i;
const passwordyRegex = /pw|pwd|passwd/i;
const loginRegex = /login|Войти|sign in|ورود|登录/i;
const registerButtonRegex = /create account|Zugang anlegen|Angaben prüfen|Konto erstellen|register|sign up|create an account|create my account|ثبت نام|登録|Cadastrar|Зарегистрироваться|Bellige alynmak/i;
const buttonClassRegex = /button|btn/i;


function makeRuleset(coeffs, biases) {
  function cross(scoringFunction1, scoringFunction2) {
    return fnode => scoringFunction1(fnode) * scoringFunction2(fnode);
  }

  function hasPasswordLabel(fnode) {
    return hasLabelMatchingRegex(fnode.element, passwordRegex);
  }

  function hasNewLabel(fnode) {
    return hasLabelMatchingRegex(fnode.element, newRegex);
  }

  function hasConfirmLabel(fnode) {
    return hasLabelMatchingRegex(fnode.element, confirmRegex);
  }

  function hasNewPasswordLabel(fnode) {
    return cross(hasPasswordLabel, hasNewLabel)(fnode);
  }

  function hasConfirmEmailLabel(fnode) {
    return hasConfirmLabel(fnode) && hasLabelMatchingRegex(fnode.element, emailRegex);
  }

  function hasConfirmPasswordLabel(fnode) {
    return cross(hasPasswordLabel, hasConfirmLabel)(fnode);
  }

  function hasLabelMatchingRegex(element, regex) {
    // Check element.labels
    const labels = element.labels;
    // TODO: Should I be concerned with multiple labels?
    if (labels !== null && labels.length > 0) {
      return regex.test(labels[0].innerText);
    }

    // Check element.aria-labelledby
    let labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy !== null) {
      labelledBy = labelledBy.split(" ").map(id => element.ownerDocument.getElementById(id));
      if (labelledBy.length === 1) {
        return !!labelledBy[0].innerText.match(regex);
      } else if (labelledBy.length > 1) {
        return regex.test(min(labelledBy, node => euclidean(node, element)).innerText);
      }
    }

    const parentElement = element.parentElement;
    // Check if the input is in a <td>, and, if so, check the innerText of the containing <tr>
    if (parentElement.tagName === "TD") {
      // TODO: How bad is the assumption that the <tr> won't be the parent of the <td>?
      return regex.test(parentElement.parentElement.innerText);
    }

    // Check if the input is in a <dd>, and, if so, check the innerText of the preceding <dt>
    if (parentElement.tagName === "DD") {
      return regex.test(parentElement.previousElementSibling.innerText);
    }
    return false;
  }

  function closestLabelMatchesPassword(fnode) {
    return closestLabelMatchesRegex(fnode.element, passwordRegex);
  }

  function closestLabelMatchesNew(fnode) {
    return closestLabelMatchesRegex(fnode.element, newRegex);
  }

  function closestLabelMatchesConfirm(fnode) {
    return closestLabelMatchesRegex(fnode.element, confirmRegex);
  }

  function closestLabelMatchesNewPassword(fnode) {
    return cross(closestLabelMatchesPassword, closestLabelMatchesNew)(fnode);
  }

  function closestLabelMatchesConfirmPassword(fnode) {
    return cross(closestLabelMatchesPassword, closestLabelMatchesConfirm)(fnode);
  }

  function closestLabelMatchesConfirmEmail(fnode) {
    return closestLabelMatchesConfirm(fnode) && closestLabelMatchesRegex(fnode.element, emailRegex);
  }

  function closestLabelMatchesRegex(element, regex) {
    const previousElementSibling = element.previousElementSibling;
    if (previousElementSibling !== null && previousElementSibling.tagName === "label") {
      return regex.test(previousElementSibling.innerText);
    }
    const nextElementSibling = element.nextElementSibling;
    if (nextElementSibling !== null && nextElementSibling.tagName === "label") {
      return regex.test(nextElementSibling.innerText);
    }
    const closestLabelWithinForm = closestSelectorElementWithinElement(element, element.form, "label");
    if (closestLabelWithinForm !== null) {
      return regex.test(closestLabelWithinForm.innerText);
    }
    return false;
  }

  function closestSelectorElementWithinElement(toElement, withinElement, querySelector) {
    if (withinElement !== null) {
      let nodeList = Array.from(withinElement.querySelectorAll(querySelector));
      if (nodeList.length) {
        return min(nodeList, node => euclidean(node, toElement));
      }
    }
    return null;
  }

  function hasPasswordAriaLabel(fnode) {
    return hasAriaLabelMatchingRegex(fnode.element, passwordRegex);
  }

  function hasNewAriaLabel(fnode) {
    return hasAriaLabelMatchingRegex(fnode.element, newRegex);
  }

  function hasConfirmAriaLabel(fnode) {
    return hasAriaLabelMatchingRegex(fnode.element, confirmRegex);
  }

  function hasNewPasswordAriaLabel(fnode) {
    return cross(hasPasswordAriaLabel, hasNewAriaLabel)(fnode);
  }

  function hasConfirmPasswordAriaLabel(fnode) {
    return cross(hasPasswordAriaLabel, hasConfirmAriaLabel)(fnode);
  }

  function hasAriaLabelMatchingRegex(element, regex) {
    const ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel !== null) {
      return regex.test(ariaLabel);
    }
    return false;
  }

  function hasPasswordPlaceholder(fnode) {
    return hasPlaceholderMatchingRegex(fnode.element, passwordRegex);
  }

  function hasNewPlaceholder(fnode) {
    return hasPlaceholderMatchingRegex(fnode.element, newRegex);
  }

  function hasConfirmPlaceholder(fnode) {
    return hasPlaceholderMatchingRegex(fnode.element, confirmRegex);
  }

  function hasNewPasswordPlaceholder(fnode) {
    return cross(hasPasswordPlaceholder, hasNewPlaceholder)(fnode);
  }

  function hasConfirmPasswordPlaceholder(fnode) {
    return cross(hasPasswordPlaceholder, hasConfirmPlaceholder)(fnode);
  }

  function hasConfirmEmailPlaceholder(fnode) {
    return hasConfirmPlaceholder(fnode) && hasPlaceholderMatchingRegex(fnode.element, emailRegex);
  }

  function hasPlaceholderMatchingRegex(element, regex) {
    const placeholder = element.getAttribute("placeholder");
    if (placeholder !== null) {
      return regex.test(placeholder);
    }
    return false;
  }

  function forgotPasswordLinkInnerText(fnode) {
    return hasFormAnchorMatchingPredicate(fnode.element, anchor => {
      return passwordRegex.test(anchor.innerText) && forgotPasswordInnerTextRegex.test(anchor.innerText);
    });
  }

  function hasFormAnchorMatchingPredicate(element, matchingPredicate) {
    const form = element.form;
    if (form !== null) {
      const anchors = Array.from(form.querySelectorAll('a'));
      return anchors.some(matchingPredicate);
    }
    return false;
  }

  function forgotPasswordLinkHref(fnode) {
    return hasFormAnchorMatchingPredicate(fnode.element, anchor => {
      return passwordRegex.test(anchor.href) && forgotPasswordHrefRegex.test(anchor.href);
    });
  }

  function forgotPasswordLinkTitle(fnode) {
    return hasFormAnchorMatchingPredicate(fnode.element, anchor => {
      return passwordRegex.test(anchor.title) && forgotPasswordInnerTextRegex.test(anchor.title);
    });
  }

  function idIsPassword1Or2(fnode) {
    return password1Or2Regex.test(fnode.element.id);
  }

  function nameIsPassword1Or2(fnode) {
    return password1Or2Regex.test(fnode.element.name);
  }

  function idMatchesPassword(fnode) {
    return passwordRegex.test(fnode.element.id);
  }

  function nameMatchesPassword(fnode) {
    return passwordRegex.test(fnode.element.name);
  }

  function idMatchesPasswordy(fnode) {
    return passwordyRegex.test(fnode.element.id)
  }

  function nameMatchesPasswordy(fnode) {
    return passwordyRegex.test(fnode.element.name)
  }

  function classMatchesPasswordy(fnode) {
    return passwordyRegex.test(fnode.element.className)
  }

  function containingFormHasLoginAction(fnode) {
    const form = fnode.element.form;
    if (form !== null) {
      return loginRegex.test(form.action);
    }
    return false;
  }

  function containingFormHasLoginId(fnode) {
    const form = fnode.element.form;
    if (form !== null) {
      return loginRegex.test(form.id);
    }
    return false;
  }

  function formButtonIsRegistery(fnode) {
    const form = fnode.element.form;
    if (form !== null) {
      let inputs = Array.from(form.querySelectorAll("input"));
      inputs = inputs.some(input => {
        return buttonClassRegex.test(input.className) && registerButtonRegex.test(input.value);
      });
      if (inputs.length) {
        return true;
      }

      let buttons = Array.from(form.querySelectorAll("button"));
      return buttons.some(button => {
        return registerButtonRegex.test(button.value) || registerButtonRegex.test(button.innerText);
      })
    }
    return false;
  }

  function formButtonIsLoginy(fnode) {
    const form = fnode.element.form;
    if (form !== null) {
      let inputs = Array.from(form.querySelectorAll("input"));
      inputs = inputs.filter(input => {
        return buttonClassRegex.test(input.className) && loginRegex.test(input.value);
      });
      if (inputs.length) {
        return true;
      }

      let buttons = Array.from(form.querySelectorAll("button"));
      return buttons.some(button => {
        return loginRegex.test(button.value) || loginRegex.test(button.innerText);
      })
    }
    return false;
  }

  return ruleset([
      rule(dom("input[type=text],input[type=password],input[type=\"\"],input:not([type])").when(isVisible), type("new")),
      rule(type("new"), score(hasPasswordLabel), {name: "hasPasswordLabel"}),
      rule(type("new"), score(hasNewLabel), {name: "hasNewLabel"}),
      rule(type("new"), score(hasConfirmLabel), {name: "hasConfirmLabel"}),
      rule(type("new"), score(hasNewPasswordLabel), {name: "hasNewPasswordLabel"}),
      rule(type("new"), score(hasConfirmPasswordLabel), {name: "hasConfirmPasswordLabel"}),
      rule(type("new"), score(hasConfirmEmailLabel), {name: "hasConfirmEmailLabel"}),
      rule(type("new"), score(closestLabelMatchesPassword), {name: "closestLabelMatchesPassword"}),
      rule(type("new"), score(closestLabelMatchesNew), {name: "closestLabelMatchesNew"}),
      rule(type("new"), score(closestLabelMatchesConfirm), {name: "closestLabelMatchesConfirm"}),
      rule(type("new"), score(closestLabelMatchesNewPassword), {name: "closestLabelMatchesNewPassword"}),
      rule(type("new"), score(closestLabelMatchesConfirmPassword), {name: "closestLabelMatchesConfirmPassword"}),
      rule(type("new"), score(closestLabelMatchesConfirmEmail), {name: "closestLabelMatchesConfirmEmail"}),
      rule(type("new"), score(hasPasswordAriaLabel), {name: "hasPasswordAriaLabel"}),
      rule(type("new"), score(hasNewAriaLabel), {name: "hasNewAriaLabel"}),
      rule(type("new"), score(hasConfirmAriaLabel), {name: "hasConfirmAriaLabel"}),
      rule(type("new"), score(hasNewPasswordAriaLabel), {name: "hasNewPasswordAriaLabel"}),
      rule(type("new"), score(hasConfirmPasswordAriaLabel), {name: "hasConfirmPasswordAriaLabel"}),
      rule(type("new"), score(hasPasswordPlaceholder), {name: "hasPasswordPlaceholder"}),
      rule(type("new"), score(hasNewPlaceholder), {name: "hasNewPlaceholder"}),
      rule(type("new"), score(hasConfirmPlaceholder), {name: "hasConfirmPlaceholder"}),
      rule(type("new"), score(hasNewPasswordPlaceholder), {name: "hasNewPasswordPlaceholder"}),
      rule(type("new"), score(hasConfirmPasswordPlaceholder), {name: "hasConfirmPasswordPlaceholder"}),
      rule(type("new"), score(hasConfirmEmailPlaceholder), {name: "hasConfirmEmailPlaceholder"}),
      rule(type("new"), score(forgotPasswordLinkInnerText), {name: "forgotPasswordLinkInnerText"}),
      rule(type("new"), score(forgotPasswordLinkHref), {name: "forgotPasswordLinkHref"}),
      rule(type("new"), score(forgotPasswordLinkTitle), {name: "forgotPasswordLinkTitle"}),
      rule(type("new"), score(idIsPassword1Or2), {name: "idIsPassword1Or2"}),
      rule(type("new"), score(nameIsPassword1Or2), {name: "nameIsPassword1Or2"}),
      rule(type("new"), score(idMatchesPassword), {name: "idMatchesPassword"}),
      rule(type("new"), score(nameMatchesPassword), {name: "nameMatchesPassword"}),
      rule(type("new"), score(idMatchesPasswordy), {name: "idMatchesPasswordy"}),
      rule(type("new"), score(nameMatchesPasswordy), {name: "nameMatchesPasswordy"}),
      rule(type("new"), score(classMatchesPasswordy), {name: "classMatchesPasswordy"}),
      rule(type("new"), score(containingFormHasLoginAction), {name: "containingFormHasLoginAction"}),
      rule(type("new"), score(containingFormHasLoginId), {name: "containingFormHasLoginId"}),
      rule(type("new"), score(formButtonIsRegistery), {name: "formButtonIsRegistery"}),
      rule(type("new"), score(formButtonIsLoginy), {name: "formButtonIsLoginy"}),
      rule(type("new"), out("new"))
    ],
    coeffs,
    biases);
}

const trainees = new Map();
const VIEWPORT_SIZE = {width: 1366, height: 768};

const FEATURES = ["new"];
for (const feature of FEATURES) {
  const trainee = {
    coeffs: new Map(coefficients[feature]),
    viewportSize: VIEWPORT_SIZE,
    vectorType: feature,
    rulesetMaker: () => makeRuleset([
        ...coefficients.new,
      ],
      biases),
    isTarget: fnode => (fnode.element.dataset.fathom === "new" ||
                        fnode.element.dataset.fathom === "confirm")
  };
  trainees.set(feature, trainee);
}

export default trainees;
