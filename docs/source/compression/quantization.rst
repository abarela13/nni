Model Quantization with NNI
===========================

Quantization refers to compressing models by reducing the number of bits required to represent weights or activations,
which can reduce the computations and the inference time. In the context of deep neural networks, the major numerical
format for model weights is 32-bit float, or FP32. Many research works have demonstrated that weights and activations
can be represented using 8-bit integers without significant loss in accuracy. Even lower bit-widths, such as 4/2/1 bits,
is an active field of research.

A quantizer is a quantization algorithm implementation in NNI.
You can also :doc:`create your own quantizer <../tutorials/quantization_customize>` using NNI model compression interface.

.. toctree::
    :hidden:
    :maxdepth: 2

    Quickstart <../tutorials/cp_quantization_quick_start_mnist>
    Quantizer <quantizer>
    SpeedUp <../tutorials/cp_quantization_speedup>
