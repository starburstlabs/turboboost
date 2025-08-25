/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
this.Turboboost = {
  insertErrors: false,
  handleFormDisabling: true,
  defaultError: "Sorry, there was an error."
};

const turboboostable = "[data-turboboost]";
const errID = "#error_explanation";
const errTemplate = errors => `<ul><li>${$.makeArray(errors).join('</li><li>')}</li></ul>`;
const formProcessingClass = 'turboboost-form-processing';

const enableForm = function($form) {
  $form.removeClass(formProcessingClass);
  return $form.find("[type='submit']").removeAttr('disabled').data('turboboostDisabled', false);
};

const disableForm = function($form) {
  $form.addClass(formProcessingClass);
  return $form.find("[type='submit']").attr('disabled', 'disabled').data('turboboostDisabled', true);
};

const tryJSONParse = function(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
};

const insertErrorContainer = function($form) {
  const $el = $(`<div id='${errID.substr(1)}'></div>`);
  switch (Turboboost.insertErrors) {
    case "append": $form.append($el); break;
    case "beforeSubmit": $form.find("[type='submit']").before($el); break;
    case "afterSubmit": $form.find("[type='submit']").after($el); break;
    case true: $form.prepend($el); break;
    default:
      if (Turboboost.insertErrors.match(/^\W+/)) {
        $form.find(Turboboost.insertErrors).html($el);
      } else {
        $form.prepend($el);
      }
  }
  return $el;
};

const turboboostFormError = function(e, errors) {
  if (!Turboboost.insertErrors) { return; }
  errors = tryJSONParse(errors);
  if (!errors.length) { errors = [Turboboost.defaultError]; }
  const $form = $(e.target);
  let $el = $form.find(errID);
  if (!$el.length) { $el = insertErrorContainer($form); }
  return $el.html(errTemplate(errors));
};

const turboboostComplete = function(e, resp) {
  let $inserted;
  const $el = $(this);
  const isForm = this.nodeName === "FORM";
  const status = parseInt(resp.status);

  if (200 <= status && status < 300) {
    let location;
    $el.trigger("turboboost:success", tryJSONParse(resp.getResponseHeader('X-Flash')));
    if (Turboboost.insertErrors && isForm) { $el.find(errID).remove(); }
    if ((location = resp.getResponseHeader('Location')) && !$el.attr('data-no-turboboost-redirect')) {
      e.preventDefault();
      e.stopPropagation();
      Turbolinks.visit(location, {action: 'replace'});
      return;
    } else {
      if (isForm && Turboboost.handleFormDisabling) { enableForm($el); }
      $inserted = maybeInsertSuccessResponseBody(resp);
    }
  } else if (400 <= status && status  < 600) {
    if (isForm && Turboboost.handleFormDisabling) { enableForm($el); }
    $el.trigger("turboboost:error", resp.responseText);
  }

  if ($.contains(document.documentElement, $el[0])) {
    return $el.trigger("turboboost:complete");
  } else if ($inserted) {
    return $inserted.trigger("turboboost:complete");
  }
};

const turboboostBeforeSend = function(e, xhr, settings) {
  xhr.setRequestHeader('X-Turboboost', '1');
  const isForm = this.nodeName === "FORM";
  if (!isForm) { return e.stopPropagation(); }
  const $el = $(this);
  if (isForm && Turboboost.handleFormDisabling) { disableForm($el); }
  if ((settings.type === "GET") && !$el.attr('data-no-turboboost-redirect')) {
    Turbolinks.visit([this.action, $el.serialize()].join("?"));
    return false;
  }
};

const renderFunctionForOption = function(option) {
  switch (option) {
    case 'within': return 'html';
    case 'replace': return 'replaceWith';
    default:
      return option;
  }
};

const restrictResponseToBody = function(html) {
  if (/<(html|body)/i.test(html)) {
    const doc = document.documentElement.cloneNode();
    doc.innerHTML = html;
    return doc.querySelector('body').innerHTML;
  } else {
    return html;
  }
};

var maybeInsertSuccessResponseBody = function(resp) {
  let header;
  if (!(header = tryJSONParse(resp.getResponseHeader('X-Turboboost-Render')))) { return; }
  const html = restrictResponseToBody(resp.responseText);
  const renderOption = Object.keys(header)[0];
  const renderFunction = renderFunctionForOption(renderOption);
  return $(header[renderOption])[renderFunction](html);
};

const maybeReenableForms = function() {
  if (!Turboboost.handleFormDisabling) { return; }
  return $(`form${turboboostable} [type='submit']`).each(function() {
    if ($(this).data('turboboostDisabled')) { return enableForm($(this).closest('form')); }
  });
};

$(document)
  .on("ajax:beforeSend", turboboostable, turboboostBeforeSend)
  .on("ajax:complete", turboboostable, turboboostComplete)
  .on("turboboost:error", `form${turboboostable}`, turboboostFormError)
  .on("page:restore", maybeReenableForms);
