using System;

//Q.What is the difference between Overloading and Overriding?
//Method overriding is creating a method in the DERIVED class with the
//SAME NAME and SIGNATURE as a method in the base class.

//Overriding uses VIRTUAL keyword for base class method and OVERRIDE keyword for derived class method.

namespace What_is_the_difference_between_Overloading_and_Overriding
{
    class Program
    {
        public class BaseClass
        {
            public virtual void Greetings()
            {
                Console.WriteLine("BaseClass Hello!");
            }
        }

        public class DerivedClass : BaseClass
        {
            public override void Greetings()
            {
                Console.WriteLine("DerivedClass Hello!");
            }
        }
       
        static void Main(string[] args)
        {
            DerivedClass objDerived = new DerivedClass();
            objDerived.Greetings();
            Console.ReadLine();
        }

        //Ouptut: DerivedClass Hello
    }

}
