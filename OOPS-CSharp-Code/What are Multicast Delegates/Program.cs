using System;

//Q. What are Multicast Delegates?
namespace What_are_Multicast_Delegates
{
    //A Multicast Delegate in C# is a delegate that
    //holds the references of more than one function. 

    delegate void Calculator(int x, int y);

    class Program
    {
        public static void Add(int a, int b)
        {
            Console.WriteLine(a + b);
        }
        public static void Mul(int a, int b)
        {
            Console.WriteLine(a * b);
        }
        static void Main(string[] args)
        {
            Calculator calc = new Calculator(Add);
            
            calc += Mul;

            calc(20, 30);
        }
        //Output: 50  600
    }
}
