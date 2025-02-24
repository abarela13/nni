Customize Tuner
===============

NNI provides state-of-the-art tuning algorithm in builtin-tuners. NNI supports to build a tuner by yourself for tuning demand.

If you want to implement your own tuning algorithm, you can implement a customized Tuner, there are three things to do:


#. Inherit the base Tuner class
#. Implement receive_trial_result, generate_parameter and update_search_space function
#. Configure your customized tuner in experiment YAML config file

Here is an example:

**1. Inherit the base Tuner class**

.. code-block:: python

   from nni.tuner import Tuner

   class CustomizedTuner(Tuner):
       def __init__(self, *args, **kwargs):
           ...

**2. Implement receive_trial_result, generate_parameter and update_search_space function**

.. code-block:: python

   from nni.tuner import Tuner

   class CustomizedTuner(Tuner):
       def __init__(self, *args, **kwargs):
           ...

       def receive_trial_result(self, parameter_id, parameters, value, **kwargs):
           '''
           Receive trial's final result.
           parameter_id: int
           parameters: object created by 'generate_parameters()'
           value: final metrics of the trial, including default metric
           '''
           # your code implements here.
       ...

       def generate_parameters(self, parameter_id, **kwargs):
           '''
           Returns a set of trial (hyper-)parameters, as a serializable object
           parameter_id: int
           '''
           # your code implements here.
           return your_parameters
       ...

       def update_search_space(self, search_space):
           '''
           Tuners are advised to support updating search space at run-time.
           If a tuner can only set search space once before generating first hyper-parameters,
           it should explicitly document this behaviour.
           search_space: JSON object created by experiment owner
           '''
           # your code implements here.
       ...

``receive_trial_result`` will receive the ``parameter_id, parameters, value`` as parameters input. Also, Tuner will receive the ``value`` object are exactly same value that Trial send.

The ``your_parameters`` return from ``generate_parameters`` function, will be package as json object by NNI SDK. NNI SDK will unpack json object so the Trial will receive the exact same ``your_parameters`` from Tuner.

For example:
If the you implement the ``generate_parameters`` like this:

.. code-block:: python

   def generate_parameters(self, parameter_id, **kwargs):
       '''
       Returns a set of trial (hyper-)parameters, as a serializable object
       parameter_id: int
       '''
       # your code implements here.
       return {"dropout": 0.3, "learning_rate": 0.4}

It means your Tuner will always generate parameters ``{"dropout": 0.3, "learning_rate": 0.4}``. Then Trial will receive ``{"dropout": 0.3, "learning_rate": 0.4}`` by calling API ``nni.get_next_parameter()``. Once the trial ends with a result (normally some kind of metrics), it can send the result to Tuner by calling API ``nni.report_final_result()``, for example ``nni.report_final_result(0.93)``. Then your Tuner's ``receive_trial_result`` function will receied the result like：

.. code-block:: python

   parameter_id = 82347
   parameters = {"dropout": 0.3, "learning_rate": 0.4}
   value = 0.93

**Note that** The working directory of your tuner is ``<home>/nni-experiments/<experiment_id>/log``, which can be retrieved with environment variable ``NNI_LOG_DIRECTORY``, therefore, if you want to access a file (e.g., ``data.txt``) in the directory of your own tuner, you cannot use ``open('data.txt', 'r')``. Instead, you should use the following:

.. code-block:: python

   _pwd = os.path.dirname(__file__)
   _fd = open(os.path.join(_pwd, 'data.txt'), 'r')

This is because your tuner is not executed in the directory of your tuner (i.e., ``pwd`` is not the directory of your own tuner).

**3. Configure your customized tuner in experiment YAML config file**

NNI needs to locate your customized tuner class and instantiate the class, so you need to specify the location of the customized tuner class and pass literal values as parameters to the __init__ constructor.

.. code-block:: yaml

   tuner:
     codeDir: /home/abc/mytuner
     classFileName: my_customized_tuner.py
     className: CustomizedTuner
     # Any parameter need to pass to your tuner class __init__ constructor
     # can be specified in this optional classArgs field, for example
     classArgs:
       arg1: value1

More detail example you could see:

..

   * :githublink:`evolution-tuner <nni/algorithms/hpo/evolution_tuner.py>`
   * :githublink:`hyperopt-tuner <nni/algorithms/hpo/hyperopt_tuner.py>`
   * :githublink:`evolution-based-customized-tuner <examples/tuners/ga_customer_tuner>`


Write a more advanced automl algorithm
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The methods above are usually enough to write a general tuner. However, users may also want more methods, for example, intermediate results, trials' state (e.g., the methods in assessor), in order to have a more powerful automl algorithm. Therefore, we have another concept called ``advisor`` which directly inherits from ``MsgDispatcherBase`` in :githublink:`msg_dispatcher_base.py <nni/runtime/msg_dispatcher_base.py>`. Please refer to `here <CustomizeAdvisor.rst>`__ for how to write a customized advisor.

Customize Assessor
==================

NNI supports to build an assessor by yourself for tuning demand.

If you want to implement a customized Assessor, there are three things to do:


#. Inherit the base Assessor class
#. Implement assess_trial function
#. Configure your customized Assessor in experiment YAML config file

**1. Inherit the base Assessor class**

.. code-block:: python

   from nni.assessor import Assessor

   class CustomizedAssessor(Assessor):
       def __init__(self, *args, **kwargs):
           ...

**2. Implement assess trial function**

.. code-block:: python

   from nni.assessor import Assessor, AssessResult

   class CustomizedAssessor(Assessor):
       def __init__(self, *args, **kwargs):
           ...

       def assess_trial(self, trial_history):
           """
           Determines whether a trial should be killed. Must override.
           trial_history: a list of intermediate result objects.
           Returns AssessResult.Good or AssessResult.Bad.
           """
           # you code implement here.
           ...

**3. Configure your customized Assessor in experiment YAML config file**

NNI needs to locate your customized Assessor class and instantiate the class, so you need to specify the location of the customized Assessor class and pass literal values as parameters to the __init__ constructor.

.. code-block:: yaml

   assessor:
     codeDir: /home/abc/myassessor
     classFileName: my_customized_assessor.py
     className: CustomizedAssessor
     # Any parameter need to pass to your Assessor class __init__ constructor
     # can be specified in this optional classArgs field, for example
     classArgs:
       arg1: value1

Please noted in **2**. The object ``trial_history`` are exact the object that Trial send to Assessor by using SDK ``report_intermediate_result`` function.

The working directory of your assessor is ``<home>/nni-experiments/<experiment_id>/log``\ , which can be retrieved with environment variable ``NNI_LOG_DIRECTORY``\ ,

More detail example you could see:

* :githublink:`medianstop-assessor <nni/algorithms/hpo/medianstop_assessor.py>`
* :githublink:`curvefitting-assessor <nni/algorithms/hpo/curvefitting_assessor/>`
