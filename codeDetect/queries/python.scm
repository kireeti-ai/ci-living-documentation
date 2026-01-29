; US-10: Python Function and Class Extraction
; US-12: Docstring/Comment Extraction
; US-15: Import Analysis

; ============================================
; FUNCTION DEFINITIONS
; ============================================
(function_definition
  name: (identifier) @function.name
  parameters: (parameters) @function.params
  body: (block) @function.body) @function.definition

; Async functions
(function_definition
  name: (identifier) @function.async.name
  parameters: (parameters) @function.params
  body: (block) @function.body) @function.async

; ============================================
; CLASS DEFINITIONS
; ============================================
(class_definition
  name: (identifier) @class.name
  body: (block) @class.body) @class.definition

(class_definition
  name: (identifier) @class.name
  superclasses: (argument_list) @class.bases
  body: (block) @class.body) @class.inheritance

; ============================================
; DECORATORS (US-10)
; ============================================
(decorator
  (identifier) @decorator.name) @decorator.simple

(decorator
  (call
    function: (identifier) @decorator.name
    arguments: (argument_list) @decorator.args)) @decorator.call

(decorator
  (call
    function: (attribute
      object: (identifier) @decorator.module
      attribute: (identifier) @decorator.method)
    arguments: (argument_list) @decorator.args)) @decorator.attribute

; Flask/FastAPI route decorators (US-13: API Impact)
((decorator
  (call
    function: (attribute
      attribute: (identifier) @api.method)
    arguments: (argument_list
      (string) @api.route)))
 (#match? @api.method "^(route|get|post|put|delete|patch)$"))

; ============================================
; IMPORTS (US-15: Dependency Graph)
; ============================================
(import_statement
  name: (dotted_name) @import.module) @import.simple

(import_from_statement
  module_name: (dotted_name) @import.from.module
  name: (dotted_name) @import.from.name) @import.from

(import_from_statement
  module_name: (dotted_name) @import.from.module
  (aliased_import
    name: (dotted_name) @import.alias.original
    alias: (identifier) @import.alias.name)) @import.aliased

(import_from_statement
  module_name: (dotted_name) @import.from.module
  (wildcard_import)) @import.wildcard

; ============================================
; DOCSTRINGS (US-12: Context Extraction)
; ============================================
; Module docstring
(module
  (expression_statement
    (string) @docstring.module))

; Function docstring
(function_definition
  body: (block
    (expression_statement
      (string) @docstring.function)))

; Class docstring
(class_definition
  body: (block
    (expression_statement
      (string) @docstring.class)))

; ============================================
; COMMENTS (US-12)
; ============================================
(comment) @comment

; ============================================
; CONTROL FLOW (US-16: Complexity)
; ============================================
(if_statement) @complexity.if
(elif_clause) @complexity.elif
(for_statement) @complexity.for
(while_statement) @complexity.while
(try_statement) @complexity.try
(except_clause) @complexity.except
(with_statement) @complexity.with
(conditional_expression) @complexity.ternary
(raise_statement) @complexity.raise
(assert_statement) @complexity.assert
(list_comprehension) @complexity.comprehension
(dictionary_comprehension) @complexity.dict_comp
(set_comprehension) @complexity.set_comp

; ============================================
; ASSIGNMENTS & VARIABLES
; ============================================
(assignment
  left: (identifier) @variable.name
  right: (_) @variable.value) @variable.assignment

; Type annotations (Python 3.5+)
(assignment
  left: (identifier) @variable.typed.name
  type: (type) @variable.type) @variable.annotated

; ============================================
; DJANGO/ORM MODELS (US-14: Schema)
; ============================================
((class_definition
  name: (identifier) @model.name
  superclasses: (argument_list
    (attribute
      attribute: (identifier) @model.base)))
 (#match? @model.base "^Model$"))

; Field definitions
((assignment
  left: (identifier) @field.name
  right: (call
    function: (attribute
      attribute: (identifier) @field.type)))
 (#match? @field.type "^(CharField|IntegerField|TextField|ForeignKey|DateTimeField|BooleanField)$"))
