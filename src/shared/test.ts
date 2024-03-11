const ShapeFlags = {
  element: 0,
  stateful_component: 0,
  text_children: 0,
  array_children: 0,
};

// 位运算的方式(使用位运算的位或，位或)
//0000
//0001->element
//0010->stateful
//0100->text_children
//1000->array_children
