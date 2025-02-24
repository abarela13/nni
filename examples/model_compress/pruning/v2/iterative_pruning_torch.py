# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

'''
NNI example for supported iterative pruning algorithms.
In this example, we show the end-to-end iterative pruning process: pre-training -> pruning -> fine-tuning.

'''
import sys
import argparse
from tqdm import tqdm

import torch
from torchvision import datasets, transforms

from nni.algorithms.compression.v2.pytorch.pruning import (
    LinearPruner,
    AGPPruner,
    LotteryTicketPruner
)

from pathlib import Path
sys.path.append(str(Path(__file__).absolute().parents[2] / 'models'))
from cifar10.vgg import VGG


device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

normalize = transforms.Normalize((0.4914, 0.4822, 0.4465), (0.2023, 0.1994, 0.2010))

train_loader = torch.utils.data.DataLoader(
    datasets.CIFAR10('./data', train=True, transform=transforms.Compose([
        transforms.RandomHorizontalFlip(),
        transforms.RandomCrop(32, 4),
        transforms.ToTensor(),
        normalize,
    ]), download=True),
    batch_size=128, shuffle=True)

test_loader = torch.utils.data.DataLoader(
    datasets.CIFAR10('./data', train=False, transform=transforms.Compose([
        transforms.ToTensor(),
        normalize,
    ])),
    batch_size=128, shuffle=False)
criterion = torch.nn.CrossEntropyLoss()

def trainer(model, optimizer, criterion, epoch):
    model.train()
    for data, target in tqdm(iterable=train_loader, desc='Epoch {}'.format(epoch)):
        data, target = data.to(device), target.to(device)
        optimizer.zero_grad()
        output = model(data)
        loss = criterion(output, target)
        loss.backward()
        optimizer.step()

def finetuner(model):
    model.train()
    optimizer = torch.optim.SGD(model.parameters(), lr=0.1, momentum=0.9, weight_decay=5e-4)
    criterion = torch.nn.CrossEntropyLoss()
    for data, target in tqdm(iterable=train_loader, desc='Epoch PFs'):
        data, target = data.to(device), target.to(device)
        optimizer.zero_grad()
        output = model(data)
        loss = criterion(output, target)
        loss.backward()
        optimizer.step()

def evaluator(model):
    model.eval()
    correct = 0
    with torch.no_grad():
        for data, target in tqdm(iterable=test_loader, desc='Test'):
            data, target = data.to(device), target.to(device)
            output = model(data)
            pred = output.argmax(dim=1, keepdim=True)
            correct += pred.eq(target.view_as(pred)).sum().item()
    acc = 100 * correct / len(test_loader.dataset)
    print('Accuracy: {}%\n'.format(acc))
    return acc


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='PyTorch Iterative Example for model comporession')
    parser.add_argument('--pruner', type=str, default='linear',
                        choices=['linear', 'agp', 'lottery'],
                        help='pruner to use')
    parser.add_argument('--pretrain-epochs', type=int, default=10,
                        help='number of epochs to pretrain the model')
    parser.add_argument('--total-iteration', type=int, default=10,
                        help='number of iteration to iteratively prune the model')
    parser.add_argument('--pruning-algo', type=str, default='l1',
                        choices=['level', 'l1', 'l2', 'fpgm', 'slim', 'apoz',
                                 'mean_activation', 'taylorfo', 'admm'],
                        help='algorithm to evaluate weights to prune')
    parser.add_argument('--speedup', type=bool, default=False,
                        help='Whether to speedup the pruned model')
    parser.add_argument('--reset-weight', type=bool, default=True,
                        help='Whether to reset weight during each iteration')

    args = parser.parse_args()

    model = VGG().to(device)
    optimizer = torch.optim.SGD(model.parameters(), lr=0.1, momentum=0.9, weight_decay=5e-4)
    criterion = torch.nn.CrossEntropyLoss()

    # pre-train the model
    for i in range(args.pretrain_epochs):
        trainer(model, optimizer, criterion, i)
        evaluator(model)

    config_list = [{'op_types': ['Conv2d'], 'sparsity': 0.8}]
    dummy_input = torch.rand(10, 3, 32, 32).to(device)

    # if you just want to keep the final result as the best result, you can pass evaluator as None.
    # or the result with the highest score (given by evaluator) will be the best result.
    kw_args = {'pruning_algorithm': args.pruning_algo,
               'total_iteration': args.total_iteration,
               'evaluator': None,
               'finetuner': finetuner}

    if args.speedup:
        kw_args['speedup'] = args.speedup
        kw_args['dummy_input'] = torch.rand(10, 3, 32, 32).to(device)

    if args.pruner == 'linear':
        iterative_pruner = LinearPruner
    elif args.pruner == 'agp':
        iterative_pruner = AGPPruner
    elif args.pruner == 'lottery':
        kw_args['reset_weight'] = args.reset_weight
        iterative_pruner = LotteryTicketPruner

    pruner = iterative_pruner(model, config_list, **kw_args)
    pruner.compress()
    _, model, masks, _, _ = pruner.get_best_result()
    evaluator(model)
