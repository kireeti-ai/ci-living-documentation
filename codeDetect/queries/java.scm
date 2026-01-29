; US-6: Java Class and Method Extraction
; US-7: Spring Annotations Detection
; US-12: Comment/Docstring Extraction
; US-13: API Endpoint Detection

; ============================================
; CLASS DEFINITIONS
; ============================================
(class_declaration
  name: (identifier) @class.name
  body: (class_body) @class.body) @class.definition

; ============================================
; METHOD DEFINITIONS
; ============================================
(method_declaration
  name: (identifier) @method.name
  parameters: (formal_parameters) @method.params
  body: (block)? @method.body) @method.definition

; Constructor definitions
(constructor_declaration
  name: (identifier) @constructor.name
  parameters: (formal_parameters) @constructor.params) @constructor.definition

; ============================================
; ANNOTATIONS (US-7: Spring Annotations)
; ============================================
(marker_annotation
  name: (identifier) @annotation.name) @annotation

(annotation
  name: (identifier) @annotation.name
  arguments: (annotation_argument_list)? @annotation.args) @annotation.full

; Spring Controller annotations
((marker_annotation
  name: (identifier) @annotation.name)
 (#match? @annotation.name "^(RestController|Controller|Service|Repository|Component)$"))

; Spring Mapping annotations (US-13: API Impact)
((annotation
  name: (identifier) @api.annotation
  arguments: (annotation_argument_list
    (element_value_pair
      value: (string_literal) @api.route)?
    (string_literal)? @api.route.direct)?)
 (#match? @api.annotation "^(RequestMapping|GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping)$"))

; ============================================
; SCHEMA ANNOTATIONS (US-14)
; ============================================
((marker_annotation
  name: (identifier) @schema.annotation)
 (#match? @schema.annotation "^(Entity|Table|Column|Id|OneToMany|ManyToOne|ManyToMany|JoinColumn)$"))

; ============================================
; IMPORTS (US-15: Dependency Graph)
; ============================================
(import_declaration
  (scoped_identifier) @import.path) @import

(import_declaration
  (identifier) @import.simple) @import.single

; ============================================
; COMMENTS (US-12: Context Extraction)
; ============================================
(line_comment) @comment.line
(block_comment) @comment.block

; Javadoc comments
((block_comment) @comment.javadoc
 (#match? @comment.javadoc "^/\\*\\*"))

; ============================================
; CONTROL FLOW (US-16: Complexity)
; ============================================
(if_statement) @complexity.if
(for_statement) @complexity.for
(enhanced_for_statement) @complexity.foreach
(while_statement) @complexity.while
(do_statement) @complexity.do
(switch_expression) @complexity.switch
(try_statement) @complexity.try
(catch_clause) @complexity.catch
(ternary_expression) @complexity.ternary
(throw_statement) @complexity.throw

; ============================================
; FIELD DECLARATIONS
; ============================================
(field_declaration
  type: (_) @field.type
  declarator: (variable_declarator
    name: (identifier) @field.name)) @field.definition
