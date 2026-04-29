using System;

//Q. What is the difference between Method Overriding and Method Hiding?
//In Method Hiding, you can hide the implementation of the methods of a base class from the derived class using the new keyword.
//In other words, in overriding you are overriding the method but here in method hiding, you are completely redefining the method.

//When to use method hiding?
//If child class wants to implement some of the methods of the base class without disturbing base class.
namespace What_is_the_difference_between_Method_Overriding_and_Method_Hiding
{
    class Program
    {
        
        public class BaseClass
        {
            public void Greetings()
            {
                Console.WriteLine("BaseClass Hello!");
            }
        }

        public class DerivedClass : BaseClass
        {
            public new void Greetings()
            {
                Console.WriteLine("DerivedClass Hello!");
            }
        }

        static void Main(string[] args)
        {
            BaseClass objDerived = new DerivedClass();

            objDerived.Greetings();
            Console.ReadLine();
        }

        //Ouptut: BaseClass Hello

        //static void Main(string[] args)
        //{
        //    BaseClass baseClass = new DerivedClass();
        //    baseClass.Print();

        //    Console.ReadLine();
        //}
    }
   

}
