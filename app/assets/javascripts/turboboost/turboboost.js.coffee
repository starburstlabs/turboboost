@Turboboost =
  insertErrors: false
  handleFormDisabling: true
  defaultError: "Sorry, there was an error."

turboboostable = "[data-turboboost]"
errID = "#error_explanation"
errTemplate = (errors) ->
  "<ul><li>#{$.makeArray(errors).join('</li><li>')}</li></ul>"
formProcessingClass = 'turboboost-form-processing'

enableForm = ($form) ->
  $form.removeClass(formProcessingClass)
  $form.find("[type='submit']").removeAttr('disabled').data('turboboostDisabled', false)

disableForm = ($form) ->
  $form.addClass(formProcessingClass)
  $form.find("[type='submit']").attr('disabled', 'disabled').data('turboboostDisabled', true)

tryJSONParse = (str) ->
  try
    JSON.parse str
  catch e
    null

insertErrorContainer = ($form) ->
  $el = $("<div id='#{errID.substr(1)}'></div>")
  switch Turboboost.insertErrors
    when "append" then $form.append($el)
    when "beforeSubmit" then $form.find("[type='submit']").before($el)
    when "afterSubmit" then $form.find("[type='submit']").after($el)
    when true then $form.prepend($el)
    else
      if Turboboost.insertErrors.match(/^\W+/)
        $form.find(Turboboost.insertErrors).html($el)
      else
        $form.prepend($el)
  $el

turboboostFormError = (e, errors) ->
  return if !Turboboost.insertErrors
  errors = tryJSONParse errors
  errors = [Turboboost.defaultError] if !errors.length
  $form = $(e.target)
  $el = $form.find(errID)
  $el = insertErrorContainer($form) if !$el.length
  $el.html errTemplate(errors)

turboboostComplete = (e, resp) ->
  $el = $(@)
  isForm = @nodeName is "FORM"
  status = parseInt(resp.status)

  if 200 <= status < 300
    $el.trigger "turboboost:success", tryJSONParse resp.getResponseHeader('X-Flash')
    $el.find(errID).remove() if Turboboost.insertErrors and isForm
    if (location = resp.getResponseHeader('Location')) and !$el.attr('data-no-turboboost-redirect')
      e.preventDefault()
      e.stopPropagation()
      Turbolinks.visit(location, action: 'replace')
      return
    else
      enableForm $el if isForm and Turboboost.handleFormDisabling
      $inserted = maybeInsertSuccessResponseBody(resp)
  else if 400 <= status  < 600
    enableForm $el if isForm and Turboboost.handleFormDisabling
    $el.trigger "turboboost:error", resp.responseText

  if $.contains(document.documentElement, $el[0])
    $el.trigger "turboboost:complete"
  else if $inserted
    $inserted.trigger "turboboost:complete"

turboboostBeforeSend = (e, xhr, settings) ->
  xhr.setRequestHeader('X-Turboboost', '1')
  isForm = @nodeName is "FORM"
  return e.stopPropagation() unless isForm
  $el = $(@)
  disableForm $el if isForm and Turboboost.handleFormDisabling
  if settings.type is "GET" and !$el.attr('data-no-turboboost-redirect')
    Turbolinks.visit [@action, $el.serialize()].join("?")
    return false

renderFunctionForOption = (option) ->
  switch option
    when 'within' then 'html'
    when 'replace' then 'replaceWith'
    else
      option

restrictResponseToBody = (html) ->
  if /<(html|body)/i.test(html)
    doc = document.documentElement.cloneNode()
    doc.innerHTML = html
    doc.querySelector('body').innerHTML
  else
    html

maybeInsertSuccessResponseBody = (resp) ->
  return unless (header = tryJSONParse(resp.getResponseHeader('X-Turboboost-Render')))
  html = restrictResponseToBody(resp.responseText)
  renderOption = Object.keys(header)[0]
  renderFunction = renderFunctionForOption(renderOption)
  $(header[renderOption])[renderFunction](html)

maybeReenableForms = ->
  return unless Turboboost.handleFormDisabling
  $("form#{turboboostable} [type='submit']").each ->
    enableForm $(@).closest('form') if $(@).data('turboboostDisabled')

$(document)
  .on("ajax:beforeSend", turboboostable, turboboostBeforeSend)
  .on("ajax:complete", turboboostable, turboboostComplete)
  .on("turboboost:error", "form#{turboboostable}", turboboostFormError)
  .on("page:restore", maybeReenableForms)
