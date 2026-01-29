; US-8: JavaScript/TypeScript Export Detection
; US-9: React Component Detection
; US-12: Comment Extraction
; US-15: Import/Dependency Analysis

; ============================================
; FUNCTION DEFINITIONS
; ============================================
(function_declaration
  name: (identifier) @function.name
  parameters: (formal_parameters) @function.params
  body: (statement_block) @function.body) @function.definition

; Arrow functions assigned to variables
(lexical_declaration
  (variable_declarator
    name: (identifier) @function.name
    value: (arrow_function
      parameters: (_) @function.params
      body: (_) @function.body))) @function.arrow

; Regular function expressions
(variable_declaration
  (variable_declarator
    name: (identifier) @function.name
    value: (function_expression
      parameters: (formal_parameters) @function.params))) @function.expression

; ============================================
; CLASS DEFINITIONS
; ============================================
(class_declaration
  name: (identifier) @class.name
  body: (class_body) @class.body) @class.definition

(method_definition
  name: (property_identifier) @method.name
  parameters: (formal_parameters) @method.params) @method.definition

; ============================================
; EXPORTS (US-8)
; ============================================
(export_statement
  declaration: (function_declaration
    name: (identifier) @export.function.name)) @export.function

(export_statement
  declaration: (class_declaration
    name: (identifier) @export.class.name)) @export.class

(export_statement
  declaration: (lexical_declaration
    (variable_declarator
      name: (identifier) @export.const.name))) @export.const

; Default exports
(export_statement
  (identifier) @export.default.name) @export.default

; Named exports
(export_statement
  (export_clause
    (export_specifier
      name: (identifier) @export.named.name))) @export.named

; ============================================
; REACT COMPONENTS (US-9)
; ============================================
; Function components (PascalCase convention)
((function_declaration
  name: (identifier) @component.name
  body: (statement_block
    (return_statement
      (jsx_element)))) @component.function
 (#match? @component.name "^[A-Z]"))

; Arrow function components
((lexical_declaration
  (variable_declarator
    name: (identifier) @component.name
    value: (arrow_function
      body: (_
        (jsx_element))))) @component.arrow
 (#match? @component.name "^[A-Z]"))

; JSX Elements
(jsx_element
  open_tag: (jsx_opening_element
    name: (_) @jsx.tag.name)) @jsx.element

(jsx_self_closing_element
  name: (_) @jsx.self.name) @jsx.self

; ============================================
; REACT HOOKS (US-9)
; ============================================
((call_expression
  function: (identifier) @hook.name)
 (#match? @hook.name "^use[A-Z]"))

; ============================================
; IMPORTS (US-15: Dependency Graph)
; ============================================
(import_statement
  source: (string) @import.source) @import

(import_statement
  (import_clause
    (identifier) @import.default)) @import.default.clause

(import_statement
  (import_clause
    (named_imports
      (import_specifier
        name: (identifier) @import.named)))) @import.named.clause

; ============================================
; COMMENTS (US-12)
; ============================================
(comment) @comment

; JSDoc comments
((comment) @comment.jsdoc
 (#match? @comment.jsdoc "^/\\*\\*"))

; ============================================
; CONTROL FLOW (US-16: Complexity)
; ============================================
(if_statement) @complexity.if
(for_statement) @complexity.for
(for_in_statement) @complexity.forin
(while_statement) @complexity.while
(do_statement) @complexity.do
(switch_statement) @complexity.switch
(try_statement) @complexity.try
(catch_clause) @complexity.catch
(ternary_expression) @complexity.ternary
(throw_statement) @complexity.throw

; ============================================
; EXPRESS/API ROUTES (US-13)
; ============================================
((call_expression
  function: (member_expression
    object: (identifier) @api.object
    property: (property_identifier) @api.method)
  arguments: (arguments
    (string) @api.route))
 (#match? @api.method "^(get|post|put|delete|patch|use)$"))
